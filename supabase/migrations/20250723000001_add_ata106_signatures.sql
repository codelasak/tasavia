-- Add ATA 106 signature storage and completion tracking
-- This migration adds support for digital signatures and certification tracking

-- Add completion tracking to sales_orders
ALTER TABLE sales_orders 
ADD COLUMN ata106_completion_status VARCHAR(20) DEFAULT 'pending' CHECK (ata106_completion_status IN ('pending', 'draft', 'pending_transferee', 'completed')),
ADD COLUMN ata106_completed_at TIMESTAMP,
ADD COLUMN ata106_completed_by UUID REFERENCES auth.users(id),
ADD COLUMN ata106_form_version VARCHAR(10) DEFAULT '1.0';

-- Add comments for new columns
COMMENT ON COLUMN sales_orders.ata106_completion_status IS 'ATA 106 form completion status';
COMMENT ON COLUMN sales_orders.ata106_completed_at IS 'Timestamp when ATA 106 form was fully completed';
COMMENT ON COLUMN sales_orders.ata106_completed_by IS 'User who completed the ATA 106 form';
COMMENT ON COLUMN sales_orders.ata106_form_version IS 'Version of the ATA 106 form used';

-- Create ATA 106 signatures table
CREATE TABLE ata106_signatures (
    signature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    signature_type VARCHAR(20) NOT NULL CHECK (signature_type IN ('transferor', 'transferee')),
    
    -- Signature data
    signature_data TEXT NOT NULL, -- Base64 encoded signature image
    signer_name VARCHAR(100) NOT NULL,
    signer_title VARCHAR(100) NOT NULL,
    certificate_number VARCHAR(50),
    
    -- Audit trail
    signed_by UUID REFERENCES auth.users(id),
    signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure only one signature per type per sales order
    UNIQUE(sales_order_id, signature_type)
);

-- Add comments for signature table
COMMENT ON TABLE ata106_signatures IS 'Digital signatures for ATA 106 forms with audit trail';
COMMENT ON COLUMN ata106_signatures.signature_data IS 'Base64 encoded signature image data';
COMMENT ON COLUMN ata106_signatures.signer_name IS 'Full name of the person signing';
COMMENT ON COLUMN ata106_signatures.signer_title IS 'Title/position of the signer';
COMMENT ON COLUMN ata106_signatures.certificate_number IS 'Professional certificate or license number';
COMMENT ON COLUMN ata106_signatures.signed_by IS 'User account that created the signature';
COMMENT ON COLUMN ata106_signatures.ip_address IS 'IP address from which signature was created';
COMMENT ON COLUMN ata106_signatures.user_agent IS 'Browser user agent string';

-- Create indexes for performance
CREATE INDEX idx_ata106_signatures_sales_order ON ata106_signatures(sales_order_id);
CREATE INDEX idx_ata106_signatures_type ON ata106_signatures(signature_type);
CREATE INDEX idx_ata106_signatures_signed_at ON ata106_signatures(signed_at);
CREATE INDEX idx_sales_orders_ata106_status ON sales_orders(ata106_completion_status);

-- Create trigger to update sales_order completion status
CREATE OR REPLACE FUNCTION update_ata106_completion_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    transferor_exists BOOLEAN;
    transferee_exists BOOLEAN;
    new_status VARCHAR(20);
BEGIN
    -- Check if both signature types exist for this sales order
    SELECT EXISTS(
        SELECT 1 FROM ata106_signatures 
        WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id) 
        AND signature_type = 'transferor'
    ) INTO transferor_exists;
    
    SELECT EXISTS(
        SELECT 1 FROM ata106_signatures 
        WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id) 
        AND signature_type = 'transferee'
    ) INTO transferee_exists;
    
    -- Determine new status
    IF transferor_exists AND transferee_exists THEN
        new_status := 'completed';
    ELSIF transferor_exists THEN
        new_status := 'pending_transferee';
    ELSE
        new_status := 'draft';
    END IF;
    
    -- Update sales_orders table
    UPDATE sales_orders 
    SET 
        ata106_completion_status = new_status,
        ata106_completed_at = CASE 
            WHEN new_status = 'completed' THEN NOW() 
            ELSE NULL 
        END,
        ata106_completed_by = CASE 
            WHEN new_status = 'completed' THEN NEW.signed_by 
            ELSE NULL 
        END
    WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for signature table
CREATE TRIGGER trg_ata106_signature_completion
    AFTER INSERT OR UPDATE OR DELETE ON ata106_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_ata106_completion_status();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ata106_signatures_updated_at
    BEFORE UPDATE ON ata106_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for ATA 106 form status with signatures
CREATE OR REPLACE VIEW ata106_form_status AS
SELECT 
    so.sales_order_id,
    so.invoice_number,
    so.ata106_completion_status,
    so.ata106_completed_at,
    so.ata106_completed_by,
    so.ata106_form_version,
    
    -- Transferor signature info
    ts.signature_id as transferor_signature_id,
    ts.signer_name as transferor_name,
    ts.signer_title as transferor_title,
    ts.certificate_number as transferor_certificate,
    ts.signed_at as transferor_signed_at,
    
    -- Transferee signature info
    te.signature_id as transferee_signature_id,
    te.signer_name as transferee_name,
    te.signer_title as transferee_title,
    te.certificate_number as transferee_certificate,
    te.signed_at as transferee_signed_at,
    
    -- Compliance metrics
    CASE 
        WHEN ts.signature_id IS NOT NULL AND te.signature_id IS NOT NULL THEN 100
        WHEN ts.signature_id IS NOT NULL OR te.signature_id IS NOT NULL THEN 50
        ELSE 0
    END as completion_percentage,
    
    -- Form readiness
    CASE 
        WHEN so.ata106_completion_status = 'completed' THEN 'ready_for_export'
        WHEN so.ata106_completion_status = 'pending_transferee' THEN 'awaiting_transferee'
        WHEN so.ata106_completion_status = 'draft' THEN 'awaiting_signatures'
        ELSE 'pending'
    END as export_status

FROM sales_orders so
LEFT JOIN ata106_signatures ts ON so.sales_order_id = ts.sales_order_id AND ts.signature_type = 'transferor'
LEFT JOIN ata106_signatures te ON so.sales_order_id = te.sales_order_id AND te.signature_type = 'transferee'
WHERE EXISTS (
    -- Only include sales orders that have traceable items
    SELECT 1 FROM sales_order_items soi
    JOIN inventory i ON soi.inventory_id = i.inventory_id
    WHERE soi.sales_order_id = so.sales_order_id
    AND (i.traceability_source IS NOT NULL 
         OR i.traceable_to IS NOT NULL 
         OR i.last_certified_agency IS NOT NULL)
);

-- Add comment for the view
COMMENT ON VIEW ata106_form_status IS 'Comprehensive view of ATA 106 form completion status with signature details';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ata106_signatures TO authenticated;
GRANT SELECT ON ata106_form_status TO authenticated;
GRANT USAGE ON SEQUENCE ata106_signatures_signature_id_seq TO authenticated;

-- Grant permissions to service role for admin operations
GRANT ALL ON ata106_signatures TO service_role;
GRANT ALL ON ata106_form_status TO service_role;

-- Create function to get ATA 106 compliance status
CREATE OR REPLACE FUNCTION get_ata106_compliance_status(p_sales_order_id UUID)
RETURNS TABLE(
    sales_order_id UUID,
    compliance_level VARCHAR(20),
    completion_percentage INTEGER,
    missing_signatures TEXT[],
    ready_for_export BOOLEAN,
    form_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        afs.sales_order_id,
        CASE 
            WHEN afs.completion_percentage = 100 THEN 'complete'
            WHEN afs.completion_percentage > 0 THEN 'partial'
            ELSE 'none'
        END::VARCHAR(20) as compliance_level,
        afs.completion_percentage,
        CASE 
            WHEN afs.transferor_signature_id IS NULL AND afs.transferee_signature_id IS NULL 
                THEN ARRAY['transferor', 'transferee']
            WHEN afs.transferor_signature_id IS NULL 
                THEN ARRAY['transferor']
            WHEN afs.transferee_signature_id IS NULL 
                THEN ARRAY['transferee']
            ELSE ARRAY[]::TEXT[]
        END as missing_signatures,
        (afs.export_status = 'ready_for_export') as ready_for_export,
        ('ATA106-' || afs.invoice_number) as form_number
    FROM ata106_form_status afs
    WHERE afs.sales_order_id = p_sales_order_id;
END;
$$;

-- Grant execution permission for the function
GRANT EXECUTE ON FUNCTION get_ata106_compliance_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ata106_compliance_status(UUID) TO service_role;

-- Add comment for the function
COMMENT ON FUNCTION get_ata106_compliance_status(UUID) IS 'Get comprehensive ATA 106 compliance status for a sales order';