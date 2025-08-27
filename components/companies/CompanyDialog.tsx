'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PlusCircle, Trash2, Truck, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

// Define types manually since we're having issues with the database types import
type MyCompanyDB = {
  my_company_id?: string;
  my_company_name: string;
  my_company_code: string;
  created_at?: string | null;
  updated_at?: string | null;
  company_contacts?: Array<{
    contact_id?: string;
    contact_name: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  }>;
  company_addresses?: Array<{
    address_id?: string;
    address_line1: string;
    address_line2?: string | null;
    city?: string | null;
    country?: string | null;
    zip_code?: string | null;
    is_primary?: boolean | null;
  }>;
};

type CompanyDB = {
  company_id?: string;
  company_name: string;
  company_code?: string | null;
  company_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  company_contacts?: Array<{
    contact_id?: string;
    contact_name: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  }>;
  company_addresses?: Array<{
    address_id?: string;
    address_line1: string;
    address_line2?: string | null;
    city?: string | null;
    country?: string | null;
    zip_code?: string | null;
    is_primary?: boolean | null;
  }>;
};

type CompanyContact = {
  contact_id?: string;
  contact_name: string | null;
  email?: string;
  phone?: string;
  role?: string;
};

type CompanyAddress = {
  address_id?: string;
  address_line1: string;
  address_line2?: string;
  city?: string;
  country?: string;
  zip_code?: string;
  is_primary?: boolean | null;
};

type ShipViaInfo = {
  ship_via_id?: string;
  predefined_company?: 'DHL' | 'FEDEX' | 'UPS' | 'TNT' | 'ARAMEX' | 'DPD' | 'SCHENKER' | 'KUEHNE_NAGEL' | 'EXPEDITORS' | 'PANALPINA' | 'CUSTOM' | null;
  custom_company_name?: string | null;
  account_no: string;
  owner?: string | null;
  ship_model?: 'IMPORT' | 'THIRD_PARTY_EXPORT' | 'GROUND' | 'SEA' | 'AIRLINE' | null;
};

// Form data types
type MyCompanyFormData = {
  my_company_name: string;
  my_company_code: string;
  company_addresses: CompanyAddress[];
  company_contacts: CompanyContact[];
  ship_via_info: ShipViaInfo[];
  // Add type discriminator
  formType: 'my_company';
};

type ExternalCompanyFormData = {
  company_name: string;
  company_code: string;
  company_type: 'vendor' | 'customer' | 'both';
  company_contacts: CompanyContact[];
  company_addresses: CompanyAddress[];
  ship_via_info: ShipViaInfo[];
  // Add type discriminator
  formType: 'external_company';
};

// Helper type for discriminated union
type FormData = MyCompanyFormData | ExternalCompanyFormData;

// Type guard to check if form data is for external company
function isExternalCompanyFormData(data: FormData): data is ExternalCompanyFormData {
  return data.formType === 'external_company';
}

// Type guard to check if form data is for my company
function isMyCompanyFormData(data: FormData): data is MyCompanyFormData {
  return data.formType === 'my_company';
}

// Type guard to check if the company is MyCompanyDB
function isMyCompany(company: any): company is MyCompanyDB {
  return company && 'my_company_name' in company;
}

// Type guard to check if the company is ExternalCompany
function isExternalCompany(company: any): company is CompanyDB {
  return company && 'company_name' in company;
}

// Schema for My Company form
const myCompanySchema = z.object({
  my_company_name: z.string().min(1, 'Company name is required'),
  my_company_code: z.string().min(1, 'Company code is required'),
  company_contacts: z.array(z.object({
    contact_id: z.string().optional(),
    contact_name: z.string().min(1, 'Contact name is required'),
    email: z.string().email('Invalid email address').or(z.literal('')).optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
  })).optional().default([]),
  company_addresses: z.array(z.object({
    address_id: z.string().optional(),
    address_line1: z.string().min(1, 'Address is required'),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    zip_code: z.string().optional(),
    is_primary: z.boolean().nullable().optional().default(false),
  })).optional().default([]),
  ship_via_info: z.array(z.object({
    ship_via_id: z.string().optional(),
    predefined_company: z.enum(['DHL', 'FEDEX', 'UPS', 'TNT', 'ARAMEX', 'DPD', 'SCHENKER', 'KUEHNE_NAGEL', 'EXPEDITORS', 'PANALPINA', 'CUSTOM']).nullable().optional(),
    custom_company_name: z.string().nullable().optional(),
    account_no: z.string().min(1, 'Account number is required'),
    owner: z.string().nullable().optional(),
    ship_model: z.enum(['IMPORT', 'THIRD_PARTY_EXPORT', 'GROUND', 'SEA', 'AIRLINE']).nullable().optional(),
  })).optional().default([]),
  formType: z.literal('my_company'),
});

// Schema for External Company form
const externalCompanySchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_code: z.string().optional(), // Allow empty for auto-generation
  company_type: z.enum(['vendor', 'customer', 'both']),
  company_contacts: z.array(z.object({
    contact_id: z.string().optional(),
    contact_name: z.string().min(1, 'Contact name is required'),
    email: z.string().email('Invalid email address').or(z.literal('')).optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
  })).optional().default([]),
  company_addresses: z.array(z.object({
    address_id: z.string().optional(),
    address_line1: z.string().min(1, 'Address is required'),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    zip_code: z.string().optional(),
    is_primary: z.boolean().nullable().optional().default(false),
  })).optional().default([]),
  ship_via_info: z.array(z.object({
    ship_via_id: z.string().optional(),
    predefined_company: z.enum(['DHL', 'FEDEX', 'UPS', 'TNT', 'ARAMEX', 'DPD', 'SCHENKER', 'KUEHNE_NAGEL', 'EXPEDITORS', 'PANALPINA', 'CUSTOM']).nullable().optional(),
    custom_company_name: z.string().nullable().optional(),
    account_no: z.string().min(1, 'Account number is required'),
    owner: z.string().nullable().optional(),
    ship_model: z.enum(['IMPORT', 'THIRD_PARTY_EXPORT', 'GROUND', 'SEA', 'AIRLINE']).nullable().optional(),
  })).optional().default([]),
  formType: z.literal('external_company'),
});

// Infer the types from the schemas
type MyCompanyFormValues = z.infer<typeof myCompanySchema>;
type ExternalCompanyFormValues = z.infer<typeof externalCompanySchema>;

interface CompanyDialogProps {
  open: boolean;
  onClose: () => void;
  company?: MyCompanyDB | CompanyDB | null;
  type: 'my_company' | 'external_company';
}

// Helper function to generate company code preview
const generateCompanyCodePreview = (companyName: string): string => {
  if (!companyName) return ''
  const prefix = companyName
    .replace(/[^A-Za-z]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X')
  
  const randomSuffix = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  
  return `${prefix}${randomSuffix}`
}

export function CompanyDialog({ open, onClose, company, type }: CompanyDialogProps) {
  const [codePreview, setCodePreview] = useState('')
  const [codeValidation, setCodeValidation] = useState<{
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
    suggestions: string[];
  }>({
    isChecking: false,
    isValid: null,
    message: '',
    suggestions: []
  })
  const isMyCompanyType = type === 'my_company'
  const schema = isMyCompanyType ? myCompanySchema : externalCompanySchema

  // Initialize form with proper types based on company type
  const form = useForm<FormData>({
    resolver: zodResolver(schema as any),
    defaultValues: isMyCompanyType
      ? getMyCompanyDefaultValues(company as MyCompanyDB | undefined)
      : getExternalCompanyDefaultValues(company as CompanyDB | undefined),
  });

  // Helper functions to get default values for the form
  function getMyCompanyDefaultValues(company?: MyCompanyDB): MyCompanyFormData {
    return {
      formType: 'my_company',
      my_company_name: company?.my_company_name || '',
      my_company_code: company?.my_company_code || '',
      company_addresses: company?.company_addresses?.map(address => ({
        ...address,
        address_line2: address.address_line2 || undefined,
        city: address.city || undefined,
        country: address.country || undefined,
        zip_code: address.zip_code || undefined,
        is_primary: address.is_primary || false
      })) || [],
      company_contacts: company?.company_contacts?.map(contact => ({
        ...contact,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        role: contact.role || undefined
      })) || [],
      ship_via_info: [] // Will be loaded separately from company_ship_via table
    };
  }

  function getExternalCompanyDefaultValues(company?: CompanyDB): ExternalCompanyFormData {
    return {
      formType: 'external_company',
      company_name: company?.company_name || '',
      company_code: company?.company_code || '',
      company_type: (company?.company_type as 'vendor' | 'customer' | 'both') || 'vendor',
      company_contacts: company?.company_contacts?.map(contact => ({
        ...contact,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        role: contact.role || undefined
      })) || [],
      company_addresses: company?.company_addresses?.map(address => ({
        ...address,
        address_line2: address.address_line2 || undefined,
        city: address.city || undefined,
        country: address.country || undefined,
        zip_code: address.zip_code || undefined,
        is_primary: address.is_primary || false
      })) || [],
      ship_via_info: [] // Will be loaded separately from my_ship_via table
    };
  }

  // Form methods with proper typing
  const formMethods = form;

  // Type-safe field arrays for contacts and addresses
  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control as any, // Type assertion to handle the union type
    name: 'company_contacts' as const,
  });

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control: form.control as any, // Type assertion to handle the union type
    name: 'company_addresses' as const,
  });

  const { fields: shipViaFields, append: appendShipVia, remove: removeShipVia } = useFieldArray({
    control: form.control as any,
    name: 'ship_via_info' as const,
  });

  const handleAddContact = () => {
    appendContact({
      contact_id: uuidv4(),
      contact_name: '',
      email: '',
      phone: '',
      role: '',
    });
  };

  const handleAddAddress = () => {
    appendAddress({
      address_id: uuidv4(),
      address_line1: '',
      address_line2: '',
      city: '',
      country: '',
      zip_code: '',
      is_primary: false,
    });
  };

  const handleAddShipVia = () => {
    appendShipVia({
      ship_via_id: uuidv4(),
      predefined_company: undefined,
      custom_company_name: '',
      account_no: '',
      owner: '',
      ship_model: undefined
    });
  };

  // Check if company code is unique
  const checkCodeUniqueness = useCallback(async (code: string, currentCompanyId?: string) => {
    if (!code.trim()) return { isUnique: true, suggestions: [] };

    try {
      // Use unified companies table for both internal and external companies
      let query = supabase
        .from('companies')
        .select('company_code, company_id')
        .ilike('company_code', code.trim());

      // Exclude current company when editing
      if (currentCompanyId) {
        query = query.neq('company_id', currentCompanyId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const isUnique = !data || data.length === 0;
      
      // Generate suggestions if not unique
      const suggestions: string[] = [];
      if (!isUnique) {
        const baseCode = code.replace(/[-_]\d+$/, ''); // Remove existing suffix
        for (let i = 1; i <= 5; i++) {
          const suggestion = `${baseCode}-${i.toString().padStart(2, '0')}`;
          suggestions.push(suggestion);
        }
      }
      
      return { isUnique, suggestions };
    } catch (error) {
      console.error('Error checking code uniqueness:', error);
      return { isUnique: true, suggestions: [] };
    }
  }, [isMyCompanyType]);

  // Debounced code validation
  const validateCompanyCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setCodeValidation({
        isChecking: false,
        isValid: null,
        message: '',
        suggestions: []
      });
      return;
    }

    setCodeValidation(prev => ({ ...prev, isChecking: true }));

    // Get current company ID if editing
    const currentCompanyId = company ? 
      (isMyCompanyType ? (company as any).company_id || (company as MyCompanyDB).my_company_id : (company as CompanyDB).company_id) 
      : undefined;

    const { isUnique, suggestions } = await checkCodeUniqueness(code, currentCompanyId);

    setCodeValidation({
      isChecking: false,
      isValid: isUnique,
      message: isUnique ? 'Code is available' : 'This code is already taken',
      suggestions
    });
  }, [checkCodeUniqueness, company, isMyCompanyType]);

  // Debounce validation
  useEffect(() => {
    const codeField = isMyCompanyType ? 'my_company_code' : 'company_code';
    const code = form.watch(codeField);
    
    if (code) {
      const timeoutId = setTimeout(() => {
        validateCompanyCode(code);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setCodeValidation({
        isChecking: false,
        isValid: null,
        message: '',
        suggestions: []
      });
    }
  }, [form.watch(isMyCompanyType ? 'my_company_code' : 'company_code'), validateCompanyCode, isMyCompanyType]);

  // Load existing ship-via data
  const loadShipViaData = useCallback(async (companyId: string, refType: 'companies') => {
    try {
      const { data, error } = await supabase
        .from('company_ship_via')
        .select('*')
        .eq('company_id', companyId)
        .eq('company_ref_type', refType);
      
      if (error) throw error;
      
      const shipViaData = data?.map((item: any) => {
        const known = new Set(['DHL','FEDEX','UPS','TNT','ARAMEX','DPD','SCHENKER','KUEHNE_NAGEL','EXPEDITORS','PANALPINA'])
        const isKnown = known.has(item.ship_company_name)
        return {
          ship_via_id: item.ship_via_id,
          predefined_company: isKnown ? item.ship_company_name : 'CUSTOM',
          custom_company_name: isKnown ? undefined : item.ship_company_name,
          account_no: item.account_no,
          owner: item.owner,
          ship_model: item.ship_model
        }
      }) || [];
      
      form.setValue('ship_via_info', shipViaData);
    } catch (error) {
      console.error('Error loading ship via data:', error);
    }
  }, [form]);

  // Generate company code preview
  useEffect(() => {
    if (!isMyCompanyType) {
      const companyName = form.watch('company_name');
      const companyCode = form.watch('company_code');
      if (companyName && !companyCode) {
        setCodePreview(generateCompanyCodePreview(companyName));
      } else {
        setCodePreview('');
      }
    }
  }, [form, isMyCompanyType]);

  // Set default values when the company or type changes
  useEffect(() => {
    const initializeFormData = async () => {
      if (company) {
        // Transform company data to match form data structure
        if (isMyCompanyType) {
          const myCompanyData = company as MyCompanyDB;
          
          // Load ship-via data first
          let shipViaData: any[] = [];
          if (myCompanyData.my_company_id || (myCompanyData as any).company_id) {
            const companyId = myCompanyData.my_company_id || (myCompanyData as any).company_id;
            try {
              const { data } = await supabase
                .from('company_ship_via')
                .select('*')
                .eq('company_id', companyId)
                .eq('company_ref_type', 'companies');
              
              shipViaData = data?.map((item: any) => {
                const known = new Set(['DHL','FEDEX','UPS','TNT','ARAMEX','DPD','SCHENKER','KUEHNE_NAGEL','EXPEDITORS','PANALPINA'])
                const isKnown = known.has(item.ship_company_name)
                return {
                  ship_via_id: item.ship_via_id,
                  predefined_company: isKnown ? item.ship_company_name : 'CUSTOM',
                  custom_company_name: isKnown ? undefined : item.ship_company_name,
                  account_no: item.account_no,
                  owner: item.owner,
                  ship_model: item.ship_model
                }
              }) || [];
            } catch (error) {
              console.error('Error loading ship via data:', error);
            }
          }
          
          form.reset({
            my_company_name: myCompanyData.my_company_name,
            my_company_code: myCompanyData.my_company_code,
            company_addresses: myCompanyData.company_addresses?.map(address => ({
              ...address,
              address_line2: address.address_line2 || undefined,
              city: address.city || undefined,
              country: address.country || undefined,
              zip_code: address.zip_code || undefined
            })) || [],
            company_contacts: myCompanyData.company_contacts?.map(contact => ({
              ...contact,
              email: contact.email || undefined,
              phone: contact.phone || undefined,
              role: contact.role || undefined
            })) || [],
            ship_via_info: shipViaData,
            formType: 'my_company'
          });
        } else {
          const companyData = company as CompanyDB;
          
          // Load ship-via data first
          let shipViaData: any[] = [];
          if (companyData.company_id) {
            try {
              const { data } = await supabase
                .from('company_ship_via')
                .select('*')
                .eq('company_id', companyData.company_id)
                .eq('company_ref_type', 'companies');
              
              shipViaData = data?.map((item: any) => {
                const known = new Set(['DHL','FEDEX','UPS','TNT','ARAMEX','DPD','SCHENKER','KUEHNE_NAGEL','EXPEDITORS','PANALPINA'])
                const isKnown = known.has(item.ship_company_name)
                return {
                  ship_via_id: item.ship_via_id,
                  predefined_company: isKnown ? item.ship_company_name : 'CUSTOM',
                  custom_company_name: isKnown ? undefined : item.ship_company_name,
                  account_no: item.account_no,
                  owner: item.owner,
                  ship_model: item.ship_model
                }
              }) || [];
            } catch (error) {
              console.error('Error loading ship via data:', error);
            }
          }
          
          form.reset({
            company_name: companyData.company_name,
            company_code: companyData.company_code ?? '',
            company_type: (companyData.company_type ?? 'vendor') as 'vendor' | 'customer' | 'both',
            company_contacts: companyData.company_contacts?.map(contact => ({
              ...contact,
              email: contact.email || undefined,
              phone: contact.phone || undefined,
              role: contact.role || undefined
            })) || [],
            company_addresses: companyData.company_addresses?.map(address => ({
              ...address,
              address_line2: address.address_line2 || undefined,
              city: address.city || undefined,
              country: address.country || undefined,
              zip_code: address.zip_code || undefined
            })) || [],
            ship_via_info: shipViaData,
            formType: 'external_company'
          });
        }
      } else {
        form.reset(isMyCompanyType ? getMyCompanyDefaultValues() : getExternalCompanyDefaultValues());
      }
    };
    
    initializeFormData();
  }, [company, isMyCompanyType, form]);

  const onSubmit = async (formData: FormData) => {
    try {
      // Validate required fields before submission
      if (isMyCompanyFormData(formData)) {
        if (!formData.my_company_name?.trim()) {
          toast.error('Company name is required');
          return;
        }
        if (!formData.my_company_code?.trim()) {
          toast.error('Company code is required');
          return;
        }
        // Prevent submission if code is not unique
        if (codeValidation.isValid === false) {
          toast.error('Please use a unique company code or select one of the suggestions');
          return;
        }
        
        // Handle My Company form submission
        const { formType, company_addresses, company_contacts, ship_via_info, ...companyData } = formData;
        
        if (isMyCompany(company)) {
          // Update existing internal company in unified companies table
          const companyId = company.my_company_id;
          if (!companyId) throw new Error('Company ID is required for update');
          
          const unifiedCompanyData = {
            company_name: companyData.my_company_name,
            company_code: companyData.my_company_code,
            is_self: true,
            updated_at: new Date().toISOString()
          };
          
          const { error } = await supabase
            .from('companies')
            .update(unifiedCompanyData)
            .eq('company_id', companyId);
          
          if (error) throw error;
          
          // Handle company contacts
          if (company_contacts.length > 0) {
            const contactsToInsert = company_contacts.map(contact => ({
              ...contact,
              company_id: companyId,
              company_ref_type: 'companies'
            }));
            
            const { error: contactsError } = await supabase
              .from('company_contacts')
              .upsert(contactsToInsert as any);
              
            if (contactsError) throw contactsError;
          }
          
          // Handle company addresses - always delete existing ones first
          const { error: deleteAddressError } = await supabase
            .from('company_addresses')
            .delete()
            .eq('company_id', companyId)
            .eq('company_ref_type', 'companies');
          
          if (deleteAddressError) throw deleteAddressError;
          
          // Then insert new addresses if any exist
          if (company_addresses.length > 0) {
            const addressesToInsert = company_addresses
              .filter(address => address.address_line1 && address.address_line1.trim()) // Only process if address_line1 exists and is not empty
              .map(address => ({
                company_id: companyId!,
                company_ref_type: 'companies',
                address_line1: address.address_line1!.trim(),
                address_line2: address.address_line2?.trim() || null,
                city: address.city?.trim() || null,
                zip_code: address.zip_code?.trim() || null,
                country: address.country?.trim() || null,
                is_primary: address.is_primary || false,
              }));
            
            if (addressesToInsert.length > 0) {
              const { error: addressesError } = await supabase
                .from('company_addresses')
                .insert(addressesToInsert);
                
              if (addressesError) throw addressesError;
            }
          }
          
          // Handle ship-via data - always delete existing ones first
          const { error: deleteShipViaError } = await supabase
            .from('company_ship_via')
            .delete()
            .eq('company_id', companyId)
            .eq('company_ref_type', 'companies');
          
          if (deleteShipViaError) throw deleteShipViaError;
          
          // Then insert new ones if any exist and are valid
          if (ship_via_info.length > 0) {
            const shipViaToInsert = ship_via_info
              .filter(shipVia => {
                // Only process if we have a valid company name and account number
                const hasCompanyName = shipVia.predefined_company && (shipVia.predefined_company !== 'CUSTOM' || shipVia.custom_company_name);
                const hasAccountNo = shipVia.account_no && shipVia.account_no.trim();
                return hasCompanyName && hasAccountNo;
              })
              .map(shipVia => ({
                company_id: companyId,
                company_ref_type: 'companies',
                ship_company_name: shipVia.predefined_company === 'CUSTOM' ? (shipVia.custom_company_name || '') : (shipVia.predefined_company || ''),
                account_no: shipVia.account_no,
                owner: shipVia.owner || null,
                ship_model: shipVia.ship_model || null
              }));
            
            if (shipViaToInsert.length > 0) {
              const { error: shipViaError } = await supabase
                .from('company_ship_via')
                .insert(shipViaToInsert);
              
              if (shipViaError) throw shipViaError;
            }
          }
          
          toast.success('My Company updated successfully');
        } else {
          // Create new internal company in unified companies table
          const unifiedCompanyData = {
            company_name: companyData.my_company_name,
            company_code: companyData.my_company_code,
            is_self: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert(unifiedCompanyData)
            .select()
            .single();
            
          if (companyError) throw companyError;
          
          // Handle company contacts
          if (company_contacts.length > 0) {
            const contactsToInsert = company_contacts.map(contact => ({
              ...contact,
              company_id: newCompany.company_id,
              company_ref_type: 'companies'
            }));
            
            const { error: contactsError } = await supabase
              .from('company_contacts')
              .insert(contactsToInsert as any);
              
            if (contactsError) throw contactsError;
          }
          
          // Handle company addresses
          if (company_addresses.length > 0) {
            const addressesToInsert = company_addresses
              .filter(address => address.address_line1 && address.address_line1.trim()) // Only process if address_line1 exists and is not empty
              .map(address => ({
                company_id: newCompany.company_id,
                company_ref_type: 'companies',
                address_line1: address.address_line1!.trim(),
                address_line2: address.address_line2?.trim() || null,
                city: address.city?.trim() || null,
                zip_code: address.zip_code?.trim() || null,
                country: address.country?.trim() || null,
                is_primary: address.is_primary || false,
              }));
            
            if (addressesToInsert.length > 0) {
              const { error: addressesError } = await supabase
                .from('company_addresses')
                .insert(addressesToInsert);
                
              if (addressesError) throw addressesError;
            }
          }
          
          // Handle ship-via data for new my company
          if (ship_via_info.length > 0) {
            const shipViaToInsert = ship_via_info
              .filter(shipVia => {
                // Only process if we have a valid company name and account number
                const hasCompanyName = shipVia.predefined_company && (shipVia.predefined_company !== 'CUSTOM' || shipVia.custom_company_name);
                const hasAccountNo = shipVia.account_no && shipVia.account_no.trim();
                return hasCompanyName && hasAccountNo;
              })
              .map(shipVia => ({
                company_id: newCompany.company_id,
                company_ref_type: 'companies',
                ship_company_name: shipVia.predefined_company === 'CUSTOM' ? (shipVia.custom_company_name || '') : (shipVia.predefined_company || ''),
                account_no: shipVia.account_no,
                owner: shipVia.owner || null,
                ship_model: shipVia.ship_model || null
              }));
            
            if (shipViaToInsert.length > 0) {
              const { error: shipViaError } = await supabase
                .from('company_ship_via')
                .insert(shipViaToInsert);
              
              if (shipViaError) throw shipViaError;
            }
          }
          
          toast.success('My Company created successfully');
        }
      } else if (isExternalCompanyFormData(formData)) {
        if (!formData.company_name?.trim()) {
          toast.error('Company name is required');
          return;
        }
        // Check code validation for external companies too if code is provided
        if (formData.company_code?.trim() && codeValidation.isValid === false) {
          toast.error('Please use a unique company code or select one of the suggestions');
          return;
        }
        
        // Handle External Company form submission
        const { formType, ship_via_info, company_addresses, company_contacts, ...companyData } = formData;
        
        if (isExternalCompany(company)) {
          // Update existing company
          if (!company.company_id) throw new Error('Company ID is required for update');
          // Prepare update payload with optional company_type
          const updatePayload: any = {
            company_name: companyData.company_name,
            company_code: companyData.company_code || null,
          };
          if (companyData.company_type) {
            updatePayload.company_type = companyData.company_type;
          }

          // Try update with company_type; if schema lacks column, retry without it
          let updateError = null as any;
          let attemptedWithoutType = false;
          {
            const { error } = await supabase
              .from('companies')
              .update(updatePayload)
              .eq('company_id', company.company_id);
            updateError = error;
          }
          if (updateError && updateError.code === 'PGRST204' && String(updateError.message || '').includes("company_type")) {
            attemptedWithoutType = true;
            const { error } = await supabase
              .from('companies')
              .update({
                company_name: companyData.company_name,
                company_code: companyData.company_code || null,
              })
              .eq('company_id', company.company_id);
            updateError = error;
          }
          if (updateError) throw updateError;
          if (attemptedWithoutType) {
            toast.warning("'company_type' not stored: database column missing. Update saved without type.");
          }
          
          // Handle company contacts
          if (company_contacts.length > 0) {
            // First, delete existing contacts
            const { error: deleteContactsError } = await supabase
              .from('company_contacts')
              .delete()
              .eq('company_id', company.company_id)
              .eq('company_ref_type', 'companies');
            
            if (deleteContactsError) throw deleteContactsError;
            
            // Then insert new contacts
            const contactsToInsert = company_contacts
              .filter(contact => company.company_id && contact.contact_name) // Only process if company_id and contact_name exist
              .map(contact => ({
                company_id: company.company_id!,
                company_ref_type: 'companies',
                contact_name: contact.contact_name!,
                email: contact.email || null,
                phone: contact.phone || null,
                role: contact.role || null,
              }));
            
            const { error: contactsError } = await supabase
              .from('company_contacts')
              .insert(contactsToInsert);
              
            if (contactsError) throw contactsError;
          }
          
          // Handle company addresses - always delete existing ones first
          const { error: deleteAddressError } = await supabase
            .from('company_addresses')
            .delete()
            .eq('company_id', company.company_id)
            .eq('company_ref_type', 'companies');
          
          if (deleteAddressError) throw deleteAddressError;
          
          // Then insert new addresses if any exist
          if (company_addresses.length > 0) {
            const addressesToInsert = company_addresses
              .filter(address => address.address_line1 && address.address_line1.trim()) // Only process if address_line1 exists and is not empty
              .map(address => ({
                company_id: company.company_id!,
                company_ref_type: 'companies',
                address_line1: address.address_line1!.trim(),
                address_line2: address.address_line2?.trim() || null,
                city: address.city?.trim() || null,
                zip_code: address.zip_code?.trim() || null,
                country: address.country?.trim() || null,
                is_primary: address.is_primary || false,
              }));
            
            if (addressesToInsert.length > 0) {
              const { error: addressesError } = await supabase
                .from('company_addresses')
                .insert(addressesToInsert);
                
              if (addressesError) throw addressesError;
            }
          }
          
          // Handle ship-via data - always delete existing ones first
          const { error: deleteShipViaError } = await supabase
            .from('company_ship_via')
            .delete()
            .eq('company_id', company.company_id)
            .eq('company_ref_type', 'companies');
          
          if (deleteShipViaError) throw deleteShipViaError;
          
          // Then insert new ones if any exist and are valid
          if (ship_via_info.length > 0) {
            const shipViaToInsert = ship_via_info
              .filter(shipVia => {
                // Only process if we have a valid company name and account number
                const hasCompanyName = shipVia.predefined_company && (shipVia.predefined_company !== 'CUSTOM' || shipVia.custom_company_name);
                const hasAccountNo = shipVia.account_no && shipVia.account_no.trim();
                return hasCompanyName && hasAccountNo;
              })
              .map(shipVia => ({
                company_id: company.company_id!,
                company_ref_type: 'companies',
                ship_company_name: shipVia.predefined_company === 'CUSTOM' ? (shipVia.custom_company_name || '') : (shipVia.predefined_company || ''),
                account_no: shipVia.account_no,
                owner: shipVia.owner || null,
                ship_model: shipVia.ship_model || null
              }));
            
            if (shipViaToInsert.length > 0) {
              const { error: shipViaError } = await supabase
                .from('company_ship_via')
                .insert(shipViaToInsert);
              
              if (shipViaError) throw shipViaError;
            }
          }
          
          toast.success('Company updated successfully');
        } else {
          // Create new company
          // Try insert with company_type; if schema lacks column, retry without it
          let newCompany: any = null;
          let companyError: any = null;
          let createdWithoutType = false;
          {
            const res = await supabase
              .from('companies')
              .insert({
                company_name: companyData.company_name,
                company_code: companyData.company_code || null,
                company_type: companyData.company_type,
              })
              .select()
              .single();
            newCompany = res.data;
            companyError = res.error;
          }
          if (companyError && companyError.code === 'PGRST204' && String(companyError.message || '').includes("company_type")) {
            createdWithoutType = true;
            const res = await supabase
              .from('companies')
              .insert({
                company_name: companyData.company_name,
                company_code: companyData.company_code || null,
              })
              .select()
              .single();
            newCompany = res.data;
            companyError = res.error;
          }
          if (companyError) throw companyError;
          if (createdWithoutType) {
            toast.warning("'company_type' not stored: database column missing. Company created without type.");
          }
          
          // Handle company contacts
          if (company_contacts.length > 0) {
            const contactsToInsert = company_contacts.map(contact => ({
              ...contact,
              company_id: newCompany.company_id,
              company_ref_type: 'companies'
            }));
            
            const { error: contactsError } = await supabase
              .from('company_contacts')
              .insert(contactsToInsert as any);
              
            if (contactsError) throw contactsError;
          }
          
          // Handle company addresses
          if (company_addresses.length > 0) {
            const addressesToInsert = company_addresses
              .filter(address => address.address_line1 && address.address_line1.trim()) // Only process if address_line1 exists and is not empty
              .map(address => ({
                company_id: newCompany.company_id,
                company_ref_type: 'companies',
                address_line1: address.address_line1!.trim(),
                address_line2: address.address_line2?.trim() || null,
                city: address.city?.trim() || null,
                zip_code: address.zip_code?.trim() || null,
                country: address.country?.trim() || null,
                is_primary: address.is_primary || false,
              }));
            
            if (addressesToInsert.length > 0) {
              const { error: addressesError } = await supabase
                .from('company_addresses')
                .insert(addressesToInsert);
                
              if (addressesError) throw addressesError;
            }
          }
          
          // Handle ship-via data for new company
          if (ship_via_info.length > 0) {
            const shipViaToInsert = ship_via_info
              .filter(shipVia => {
                // Only process if we have a valid company name and account number
                const hasCompanyName = shipVia.predefined_company && (shipVia.predefined_company !== 'CUSTOM' || shipVia.custom_company_name);
                const hasAccountNo = shipVia.account_no && shipVia.account_no.trim();
                return hasCompanyName && hasAccountNo;
              })
              .map(shipVia => ({
                company_id: newCompany.company_id,
                company_ref_type: 'companies',
                ship_company_name: shipVia.predefined_company === 'CUSTOM' ? (shipVia.custom_company_name || '') : (shipVia.predefined_company || ''),
                account_no: shipVia.account_no,
                owner: shipVia.owner || null,
                ship_model: shipVia.ship_model || null
              }));
            
            if (shipViaToInsert.length > 0) {
              const { error: shipViaError } = await supabase
                .from('company_ship_via')
                .insert(shipViaToInsert);
              
              if (shipViaError) throw shipViaError;
            }
          }
          
          toast.success('Company created successfully');
        }
      }
      
      onClose();
      // Refresh the companies list in the parent component
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('company-updated'));
      }
    } catch (error: any) {
      console.error('Error saving company:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        // Unique constraint violation
        if (error.message?.includes('my_company_code') || error.message?.includes('company_code')) {
          toast.error('This company code is already in use. Please choose a different code.');
          // Trigger validation to show suggestions
          const codeField = isMyCompanyType ? 'my_company_code' : 'company_code';
          const currentCode = form.getValues(codeField);
          if (currentCode) {
            validateCompanyCode(currentCode);
          }
        } else {
          toast.error('A record with this information already exists. Please check your inputs.');
        }
      } else if (error.code === '23503') {
        // Foreign key constraint violation
        if (error.message?.includes('fk_company_companies')) {
          toast.error('Database configuration issue detected. Please contact support or try creating the company without addresses first.');
          console.error('Foreign key constraint conflict: The company_addresses table has conflicting constraints that reference both my_companies and companies tables. This needs to be resolved at the database level.');
        } else {
          toast.error('Cannot save company: Referenced data does not exist.');
        }
      } else {
        // Generic error message
        const message = error.message || 'Failed to save company';
        toast.error(message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[95vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {isMyCompanyType ? '🏢' : '🏭'} {company ? 'Edit' : 'Add'} {isMyCompanyType ? 'My Company' : 'External Company'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {company ? 'Update' : 'Create'} company information and manage contacts, addresses, and shipping methods.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="px-6 py-6 max-h-[75vh] overflow-y-auto space-y-8 flex-1">
          {/* Basic Information Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Basic Information</h3>
                <p className="text-sm text-gray-500">Company name, code, and type</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Company Name *</Label>
                <Input 
                  {...form.register(isMyCompanyType ? 'my_company_name' : 'company_name')} 
                  className="h-11"
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Company Code</Label>
                <div className="space-y-3">
                  <div className="relative">
                    <Input 
                      {...form.register(isMyCompanyType ? 'my_company_code' : 'company_code')} 
                      placeholder={!isMyCompanyType ? "Leave empty for auto-generation" : "Enter company code"} 
                      className={`h-11 pr-10 ${
                        codeValidation.isValid === false ? 'border-red-500 focus:border-red-500 bg-red-50' :
                        codeValidation.isValid === true ? 'border-green-500 focus:border-green-500 bg-green-50' : ''
                      }`}
                    />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {codeValidation.isChecking && (
                          <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                        )}
                        {codeValidation.isValid === true && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {codeValidation.isValid === false && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                  {/* Validation message */}
                  {codeValidation.message && (
                    <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                      codeValidation.isValid ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-700 bg-red-50 border border-red-200'
                    }`}>
                      {codeValidation.isValid ? '✅' : '❌'} {codeValidation.message}
                    </div>
                  )}
                  
                  {/* Code suggestions */}
                  {codeValidation.suggestions.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md space-y-2">
                      <div className="text-sm font-medium text-yellow-800">💡 Suggestions:</div>
                      <div className="flex flex-wrap gap-2">
                        {codeValidation.suggestions.map((suggestion) => (
                          <Badge 
                            key={suggestion}
                            variant="outline" 
                            className="cursor-pointer hover:bg-yellow-100 border-yellow-300 text-yellow-800 transition-colors"
                            onClick={() => {
                              form.setValue(isMyCompanyType ? 'my_company_code' : 'company_code', suggestion);
                              validateCompanyCode(suggestion);
                            }}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                    
                    {/* External company preview */}
                    {!isMyCompanyType && codePreview && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Preview: {codePreview}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCodePreview(generateCompanyCodePreview(form.watch('company_name')))}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {!isMyCompanyType && (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-medium text-gray-700">Company Type *</Label>
                <Select
                  value={form.watch('company_type')}
                  onValueChange={(value) => form.setValue('company_type', value as 'vendor' | 'customer' | 'both')}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select company type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor">🏭 Vendor</SelectItem>
                    <SelectItem value="customer">🛒 Customer</SelectItem>
                    <SelectItem value="both">🔄 Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            </div>
          </div>

          {/* Contacts Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Contacts</h3>
                  <p className="text-sm text-gray-500">Manage contact persons for this company</p>
                </div>
              </div>
              <Button 
                type="button" 
                onClick={handleAddContact}
                className="bg-green-600 hover:bg-green-700 text-white shadow-md"
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Add Contact
              </Button>
            </div>
            <div className="space-y-4">
              {contactFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                  <span className="text-4xl mb-2 block">👤</span>
                  No contacts added yet. Click "Add Contact" to get started.
                </div>
              ) : (
                contactFields.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👤</span>
                        <span className="font-medium text-gray-700">Contact {index + 1}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeContact(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Contact Name *</Label>
                        <Input 
                          {...form.register(`company_contacts.${index}.contact_name` as const)} 
                          className="h-10"
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Email</Label>
                        <Input 
                          type="email" 
                          {...form.register(`company_contacts.${index}.email` as const)} 
                          className="h-10"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Phone</Label>
                        <Input 
                          {...form.register(`company_contacts.${index}.phone` as const)} 
                          className="h-10"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
          </div>

          {/* Addresses Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏠</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Addresses</h3>
                  <p className="text-sm text-gray-500">Manage shipping and billing addresses</p>
                </div>
              </div>
              <Button 
                type="button" 
                onClick={handleAddAddress}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-md"
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Add Address
              </Button>
            </div>
            <div className="space-y-4">
              {addressFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                  <span className="text-4xl mb-2 block">📍</span>
                  No addresses added yet. Click "Add Address" to get started.
                </div>
              ) : (
                addressFields.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📍</span>
                        <span className="font-medium text-gray-700">Address {index + 1}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeAddress(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Street Address *</Label>
                        <Input 
                          {...form.register(`company_addresses.${index}.address_line1` as const)} 
                          className="h-10"
                          placeholder="123 Main Street"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Zip Code</Label>
                          <Input 
                            {...form.register(`company_addresses.${index}.zip_code` as const)} 
                            className="h-10"
                            placeholder="12345"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">City</Label>
                          <Input 
                            {...form.register(`company_addresses.${index}.city` as const)} 
                            className="h-10"
                            placeholder="New York"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Country</Label>
                          <Input 
                            {...form.register(`company_addresses.${index}.country` as const)} 
                            className="h-10"
                            placeholder="United States"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
          </div>

          {/* Shipping Methods Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Shipping Methods</h3>
                  <p className="text-sm text-gray-500">Configure shipping companies and account details</p>
                </div>
              </div>
              <Button 
                type="button" 
                onClick={handleAddShipVia}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-md"
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Add Shipping Method
              </Button>
            </div>
            <div className="space-y-4">
              {shipViaFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                  <span className="text-4xl mb-2 block">🚚</span>
                  No shipping methods added yet. Click "Add Shipping Method" to get started.
                </div>
              ) : (
                shipViaFields.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📦</span>
                        <span className="font-medium text-gray-700">Shipping Method {index + 1}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeShipVia(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Shipping Company *</Label>
                          <Select
                            value={form.watch(`ship_via_info.${index}.predefined_company`) || ''}
                            onValueChange={(value) => {
                              form.setValue(`ship_via_info.${index}.predefined_company`, value as any)
                              if (value !== 'CUSTOM') {
                                form.setValue(`ship_via_info.${index}.custom_company_name`, '')
                              }
                            }}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select shipping company" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DHL">🚛 DHL</SelectItem>
                              <SelectItem value="FEDEX">📦 FedEx</SelectItem>
                              <SelectItem value="UPS">🟤 UPS</SelectItem>
                              <SelectItem value="TNT">🟠 TNT</SelectItem>
                              <SelectItem value="ARAMEX">🔴 Aramex</SelectItem>
                              <SelectItem value="DPD">🟢 DPD</SelectItem>
                              <SelectItem value="SCHENKER">🔵 Schenker</SelectItem>
                              <SelectItem value="KUEHNE_NAGEL">⚪ Kuehne + Nagel</SelectItem>
                              <SelectItem value="EXPEDITORS">🟣 Expeditors</SelectItem>
                              <SelectItem value="PANALPINA">🟡 Panalpina</SelectItem>
                              <SelectItem value="CUSTOM">✏️ Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {form.watch(`ship_via_info.${index}.predefined_company`) === 'CUSTOM' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Custom Company Name *</Label>
                            <Input 
                              {...form.register(`ship_via_info.${index}.custom_company_name` as const)} 
                              className="h-11"
                              placeholder="Enter custom shipping company name" 
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Account Number *</Label>
                          <Input 
                            {...form.register(`ship_via_info.${index}.account_no` as const)} 
                            className="h-11"
                            placeholder="Enter account number"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Owner</Label>
                          <Input 
                            {...form.register(`ship_via_info.${index}.owner` as const)} 
                            className="h-11"
                            placeholder="Account owner (optional)"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Shipping Model</Label>
                        <Select
                          value={form.watch(`ship_via_info.${index}.ship_model`) || ''}
                          onValueChange={(value) => form.setValue(`ship_via_info.${index}.ship_model`, value as any)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select shipping model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IMPORT">📥 Import</SelectItem>
                            <SelectItem value="THIRD_PARTY_EXPORT">🔄 3rd Party Export</SelectItem>
                            <SelectItem value="GROUND">🚛 Ground</SelectItem>
                            <SelectItem value="SEA">🚢 Sea</SelectItem>
                            <SelectItem value="AIRLINE">✈️ Airline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50 space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={form.formState.isSubmitting}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {form.formState.isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                company ? 'Update Company' : 'Create Company'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
