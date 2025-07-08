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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PlusCircle, Trash2, Truck, RefreshCw } from 'lucide-react'

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
    is_primary: boolean | null;
  }>;
  company_addresses?: Array<{
    address_id?: string;
    address_line1: string;
    address_line2?: string | null;
    city?: string | null;
    country?: string | null;
    zip_code?: string | null;
    is_primary: boolean | null;
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
    is_primary: boolean | null;
  }>;
  company_addresses?: Array<{
    address_id?: string;
    address_line1: string;
    address_line2?: string | null;
    city?: string | null;
    country?: string | null;
    zip_code?: string | null;
    is_primary: boolean | null;
  }>;
};

type CompanyContact = {
  contact_id?: string;
  contact_name: string | null;
  email?: string;
  phone?: string;
  role?: string;
  is_primary: boolean | null;
};

type CompanyAddress = {
  address_id?: string;
  address_line1: string;
  address_line2?: string;
  city?: string;
  country?: string;
  zip_code?: string;
  is_primary: boolean | null;
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
    is_primary: z.boolean().nullable().default(false),
  })).optional().default([]),
  company_addresses: z.array(z.object({
    address_id: z.string().optional(),
    address_line1: z.string().min(1, 'Address is required'),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    zip_code: z.string().optional(),
    is_primary: z.boolean().nullable().default(false),
  })).optional().default([]),
  ship_via_info: z.array(z.object({
    ship_via_id: z.string().optional(),
    predefined_company: z.enum(['DHL', 'FEDEX', 'UPS', 'TNT', 'ARAMEX', 'DPD', 'SCHENKER', 'KUEHNE_NAGEL', 'EXPEDITORS', 'PANALPINA', 'CUSTOM']).optional(),
    custom_company_name: z.string().optional(),
    account_no: z.string().min(1, 'Account number is required'),
    owner: z.string().optional(),
    ship_model: z.enum(['IMPORT', 'THIRD_PARTY_EXPORT', 'GROUND', 'SEA', 'AIRLINE']).optional(),
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
    is_primary: z.boolean().nullable().default(false),
  })).optional().default([]),
  company_addresses: z.array(z.object({
    address_id: z.string().optional(),
    address_line1: z.string().min(1, 'Address is required'),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    zip_code: z.string().optional(),
    is_primary: z.boolean().nullable().default(false),
  })).optional().default([]),
  ship_via_info: z.array(z.object({
    ship_via_id: z.string().optional(),
    predefined_company: z.enum(['DHL', 'FEDEX', 'UPS', 'TNT', 'ARAMEX', 'DPD', 'SCHENKER', 'KUEHNE_NAGEL', 'EXPEDITORS', 'PANALPINA', 'CUSTOM']).optional(),
    custom_company_name: z.string().optional(),
    account_no: z.string().min(1, 'Account number is required'),
    owner: z.string().optional(),
    ship_model: z.enum(['IMPORT', 'THIRD_PARTY_EXPORT', 'GROUND', 'SEA', 'AIRLINE']).optional(),
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
  const [activeTab, setActiveTab] = useState('basic')
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
        zip_code: address.zip_code || undefined
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
        zip_code: address.zip_code || undefined
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
      is_primary: false
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
      is_primary: false
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

  // Load existing ship-via data
  const loadShipViaData = useCallback(async (companyId: string, refType: 'companies' | 'my_companies') => {
    try {
      const { data, error } = await supabase
        .from('company_ship_via')
        .select('*')
        .eq('company_id', companyId)
        .eq('company_ref_type', refType);
      
      if (error) throw error;
      
      const shipViaData = data?.map(item => ({
        ship_via_id: item.ship_via_id,
        predefined_company: item.predefined_company,
        custom_company_name: item.custom_company_name,
        account_no: item.account_no,
        owner: item.owner,
        ship_model: item.ship_model
      })) || [];
      
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
    if (company) {
      // Transform company data to match form data structure
      if (isMyCompanyType) {
        const myCompanyData = company as MyCompanyDB;
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
          ship_via_info: [],
          formType: 'my_company'
        });
        
        // Load ship-via data for my company
        if (myCompanyData.my_company_id) {
          loadShipViaData(myCompanyData.my_company_id, 'my_companies');
        }
      } else {
        const companyData = company as CompanyDB;
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
          ship_via_info: [],
          formType: 'external_company'
        });
        
        // Load ship-via data for external company
        if (companyData.company_id) {
          loadShipViaData(companyData.company_id, 'companies');
        }
      }
    } else {
      form.reset(isMyCompanyType ? getMyCompanyDefaultValues() : getExternalCompanyDefaultValues());
    }
  }, [company, isMyCompanyType, form, loadShipViaData]);

  const onSubmit = async (formData: FormData) => {
    try {
      // Validate required fields before submission
      if (isMyCompanyFormData(formData)) {
        if (!formData.my_company_name?.trim()) {
          toast.error('Company name is required');
          setActiveTab('basic');
          return;
        }
        if (!formData.my_company_code?.trim()) {
          toast.error('Company code is required');
          setActiveTab('basic');
          return;
        }
      } else if (isExternalCompanyFormData(formData)) {
        if (!formData.company_name?.trim()) {
          toast.error('Company name is required');
          setActiveTab('basic');
          return;
        }
      }
      if (isMyCompanyFormData(formData)) {
        // Handle My Company form submission
        const { formType, company_addresses, company_contacts, ship_via_info, ...companyData } = formData;
        
        if (isMyCompany(company)) {
          // Update existing my_company
          if (!company.my_company_id) throw new Error('Company ID is required for update');
          const { error } = await supabase
            .from('my_companies')
            .update(companyData)
            .eq('my_company_id', company.my_company_id);
          
          if (error) throw error;
          
          // Handle company contacts
          if (company_contacts.length > 0) {
            const contactsToInsert = company_contacts.map(contact => ({
              ...contact,
              company_id: company.my_company_id,
              company_ref_type: 'my_companies'
            }));
            
            const { error: contactsError } = await supabase
              .from('company_contacts')
              .upsert(contactsToInsert as any);
              
            if (contactsError) throw contactsError;
          }
          
          // Handle company addresses
          if (company_addresses.length > 0) {
            // First, delete existing addresses
            const { error: deleteAddressError } = await supabase
              .from('company_addresses')
              .delete()
              .eq('company_id', company.my_company_id)
              .eq('company_ref_type', 'my_companies');
            
            if (deleteAddressError) throw deleteAddressError;
            
            // Then insert new addresses
            const addressesToInsert = company_addresses
              .filter(address => company.my_company_id && address.address_line1) // Only process if company_id and address_line1 exist
              .map(address => ({
                company_id: company.my_company_id!,
                company_ref_type: 'my_companies',
                address_line1: address.address_line1!,
                address_line2: address.address_line2 || null,
                city: address.city || null,
                zip_code: address.zip_code || null,
                country: address.country || null,
                is_primary: address.is_primary || false
              }));
            
            const { error: addressesError } = await supabase
              .from('company_addresses')
              .insert(addressesToInsert);
              
            if (addressesError) throw addressesError;
          }
          
          // Handle ship-via data
          if (ship_via_info.length > 0) {
            // First, delete existing ship-via records
            const { error: deleteShipViaError } = await supabase
              .from('company_ship_via')
              .delete()
              .eq('company_id', company.my_company_id)
              .eq('company_ref_type', 'my_companies');
            
            if (deleteShipViaError) throw deleteShipViaError;
            
            // Then insert new ones
            const shipViaToInsert = ship_via_info.map(shipVia => ({
              company_id: company.my_company_id,
              company_ref_type: 'my_companies',
              ship_company_name: shipVia.predefined_company === 'CUSTOM' ? shipVia.custom_company_name : shipVia.predefined_company,
              predefined_company: shipVia.predefined_company,
              custom_company_name: shipVia.predefined_company === 'CUSTOM' ? shipVia.custom_company_name : null,
              account_no: shipVia.account_no,
              owner: shipVia.owner || null,
              ship_model: shipVia.ship_model || null
            }));
            
            const { error: shipViaError } = await supabase
              .from('company_ship_via')
              .insert(shipViaToInsert as any);
            
            if (shipViaError) throw shipViaError;
          }
          
          toast.success('My Company updated successfully');
        } else {
          // Create new my_company
          const { data: newCompany, error: companyError } = await supabase
            .from('my_companies')
            .insert(companyData)
            .select()
            .single();
            
          if (companyError) throw companyError;
          
          // Handle company contacts
          if (company_contacts.length > 0) {
            const contactsToInsert = company_contacts.map(contact => ({
              ...contact,
              company_id: newCompany.my_company_id,
              company_ref_type: 'my_companies'
            }));
            
            const { error: contactsError } = await supabase
              .from('company_contacts')
              .insert(contactsToInsert as any);
              
            if (contactsError) throw contactsError;
          }
          
          // Handle company addresses
          if (company_addresses.length > 0) {
            const addressesToInsert = company_addresses.map(address => ({
              company_id: newCompany.my_company_id,
              company_ref_type: 'my_companies',
              address_line1: address.address_line1,
              address_line2: address.address_line2 || null,
              city: address.city || null,
              zip_code: address.zip_code || null,
              country: address.country || null,
              is_primary: address.is_primary || false
            }));
            
            const { error: addressesError } = await supabase
              .from('company_addresses')
              .insert(addressesToInsert);
              
            if (addressesError) throw addressesError;
          }
          
          // Handle ship-via data for new my company
          if (ship_via_info.length > 0) {
            const shipViaToInsert = ship_via_info.map(shipVia => ({
              company_id: newCompany.my_company_id,
              company_ref_type: 'my_companies',
              ship_company_name: shipVia.predefined_company === 'CUSTOM' ? shipVia.custom_company_name : shipVia.predefined_company,
              predefined_company: shipVia.predefined_company,
              custom_company_name: shipVia.predefined_company === 'CUSTOM' ? shipVia.custom_company_name : null,
              account_no: shipVia.account_no,
              owner: shipVia.owner || null,
              ship_model: shipVia.ship_model || null
            }));
            
            const { error: shipViaError } = await supabase
              .from('company_ship_via')
              .insert(shipViaToInsert as any);
            
            if (shipViaError) throw shipViaError;
          }
          
          toast.success('My Company created successfully');
        }
      } else if (isExternalCompanyFormData(formData)) {
        // Handle External Company form submission
        const { formType, ship_via_info, company_addresses, company_contacts, ...companyData } = formData;
        
        if (isExternalCompany(company)) {
          // Update existing company
          if (!company.company_id) throw new Error('Company ID is required for update');
          const { error } = await supabase
            .from('companies')
            .update({
              company_name: companyData.company_name,
              company_code: companyData.company_code || null, // Allow null for auto-generation
              company_type: companyData.company_type
            })
            .eq('company_id', company.company_id);
            
          if (error) throw error;
          
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
                is_primary: contact.is_primary || false
              }));
            
            const { error: contactsError } = await supabase
              .from('company_contacts')
              .insert(contactsToInsert);
              
            if (contactsError) throw contactsError;
          }
          
          // Handle company addresses
          if (company_addresses.length > 0) {
            // First, delete existing addresses
            const { error: deleteAddressError } = await supabase
              .from('company_addresses')
              .delete()
              .eq('company_id', company.company_id)
              .eq('company_ref_type', 'companies');
            
            if (deleteAddressError) throw deleteAddressError;
            
            // Then insert new addresses
            const addressesToInsert = company_addresses
              .filter(address => company.company_id && address.address_line1) // Only process if company_id and address_line1 exist
              .map(address => ({
                company_id: company.company_id!,
                company_ref_type: 'companies',
                address_line1: address.address_line1!,
                address_line2: address.address_line2 || null,
                city: address.city || null,
                zip_code: address.zip_code || null,
                country: address.country || null,
                is_primary: address.is_primary || false
              }));
            
            const { error: addressesError } = await supabase
              .from('company_addresses')
              .insert(addressesToInsert);
              
            if (addressesError) throw addressesError;
          }
          
          // Handle ship-via data
          if (ship_via_info.length > 0) {
            // First, delete existing ship-via records
            const { error: deleteShipViaError } = await supabase
              .from('company_ship_via')
              .delete()
              .eq('company_id', company.company_id)
              .eq('company_ref_type', 'companies');
            
            if (deleteShipViaError) throw deleteShipViaError;
            
            // Then insert new ones
            const shipViaToInsert = ship_via_info.map(shipVia => ({
              company_id: company.company_id,
              company_ref_type: 'companies',
              ship_company_name: shipVia.predefined_company === 'CUSTOM' ? shipVia.custom_company_name : shipVia.predefined_company,
              predefined_company: shipVia.predefined_company,
              custom_company_name: shipVia.predefined_company === 'CUSTOM' ? shipVia.custom_company_name : null,
              account_no: shipVia.account_no,
              owner: shipVia.owner || null,
              ship_model: shipVia.ship_model || null
            }));
            
            const { error: shipViaError } = await supabase
              .from('company_ship_via')
              .insert(shipViaToInsert as any);
            
            if (shipViaError) throw shipViaError;
          }
          
          toast.success('Company updated successfully');
        } else {
          // Create new company
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({
              company_name: companyData.company_name,
              company_code: companyData.company_code || null, // Allow null for auto-generation
              company_type: companyData.company_type
            })
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
            const addressesToInsert = company_addresses.map(address => ({
              ...address,
              company_id: newCompany.company_id,
              company_ref_type: 'companies'
            }));
            
            const { error: addressesError } = await supabase
              .from('company_addresses')
              .insert(addressesToInsert as any);
              
            if (addressesError) throw addressesError;
          }
          
          // Handle ship-via data for new company
          if (ship_via_info.length > 0) {
            const shipViaToInsert = ship_via_info.map(shipVia => ({
              company_id: newCompany.company_id,
              company_ref_type: 'companies',
              ship_company_name: shipVia.predefined_company === 'CUSTOM' ? shipVia.custom_company_name : shipVia.predefined_company,
              predefined_company: shipVia.predefined_company,
              custom_company_name: shipVia.predefined_company === 'CUSTOM' ? shipVia.custom_company_name : null,
              account_no: shipVia.account_no,
              owner: shipVia.owner || null,
              ship_model: shipVia.ship_model || null
            }));
            
            const { error: shipViaError } = await supabase
              .from('company_ship_via')
              .insert(shipViaToInsert as any);
            
            if (shipViaError) throw shipViaError;
          }
          
          toast.success('Company created successfully');
        }
      }
      
      onClose();
      // Refresh the companies list in the parent component
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('company-updated'));
      }
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save company');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{company ? 'Edit' : 'Add'} {isMyCompanyType ? 'My Company' : 'External Company'}</DialogTitle>
          <DialogDescription>{company ? 'Update' : 'Create'} company information.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input {...form.register(isMyCompanyType ? 'my_company_name' : 'company_name')} />
                </div>
                <div>
                  <Label>Company Code</Label>
                  <div className="space-y-2">
                    <Input {...form.register(isMyCompanyType ? 'my_company_code' : 'company_code')} 
                           placeholder={!isMyCompanyType ? "Leave empty for auto-generation" : ""} />
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
                <div>
                  <Label>Company Type</Label>
                  <Select
                    value={form.watch('company_type')}
                    onValueChange={(value) => form.setValue('company_type', value as 'vendor' | 'customer' | 'both')}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contacts</h3>
                {contactFields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Contact Name</Label>
                        <Input {...form.register(`company_contacts.${index}.contact_name` as const)} />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input type="email" {...form.register(`company_contacts.${index}.email` as const)} />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input {...form.register(`company_contacts.${index}.phone` as const)} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={handleAddContact}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Contact
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="addresses" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Addresses</h3>
                {addressFields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input {...form.register(`company_addresses.${index}.address_line1` as const)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Zip Code</Label>
                        <Input {...form.register(`company_addresses.${index}.zip_code` as const)} />
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input {...form.register(`company_addresses.${index}.city` as const)} />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Input {...form.register(`company_addresses.${index}.country` as const)} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={handleAddAddress}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Address
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="shipping" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping Methods
                  </h3>
                  {shipViaFields.map((field, index) => (
                    <div key={field.id} className="space-y-4 rounded-md border p-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Shipping Method {index + 1}</h4>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeShipVia(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Shipping Company</Label>
                          <Select
                            value={form.watch(`ship_via_info.${index}.predefined_company`) || ''}
                            onValueChange={(value) => {
                              form.setValue(`ship_via_info.${index}.predefined_company`, value as any)
                              if (value !== 'CUSTOM') {
                                form.setValue(`ship_via_info.${index}.custom_company_name`, '')
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select shipping company" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DHL">DHL</SelectItem>
                              <SelectItem value="FEDEX">FedEx</SelectItem>
                              <SelectItem value="UPS">UPS</SelectItem>
                              <SelectItem value="TNT">TNT</SelectItem>
                              <SelectItem value="ARAMEX">Aramex</SelectItem>
                              <SelectItem value="DPD">DPD</SelectItem>
                              <SelectItem value="SCHENKER">Schenker</SelectItem>
                              <SelectItem value="KUEHNE_NAGEL">Kuehne + Nagel</SelectItem>
                              <SelectItem value="EXPEDITORS">Expeditors</SelectItem>
                              <SelectItem value="PANALPINA">Panalpina</SelectItem>
                              <SelectItem value="CUSTOM">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {form.watch(`ship_via_info.${index}.predefined_company`) === 'CUSTOM' && (
                          <div>
                            <Label>Custom Company Name</Label>
                            <Input {...form.register(`ship_via_info.${index}.custom_company_name` as const)} 
                                   placeholder="Enter custom shipping company name" />
                          </div>
                        )}
                        
                        <div>
                          <Label>Account Number</Label>
                          <Input {...form.register(`ship_via_info.${index}.account_no` as const)} />
                        </div>
                        
                        <div>
                          <Label>Owner (Optional)</Label>
                          <Input {...form.register(`ship_via_info.${index}.owner` as const)} />
                        </div>
                        
                        <div>
                          <Label>Ship Model</Label>
                          <Select
                            value={form.watch(`ship_via_info.${index}.ship_model`) || ''}
                            onValueChange={(value) => form.setValue(`ship_via_info.${index}.ship_model`, value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select ship model" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IMPORT">Import</SelectItem>
                              <SelectItem value="THIRD_PARTY_EXPORT">3rd Party Export</SelectItem>
                              <SelectItem value="GROUND">Ground</SelectItem>
                              <SelectItem value="SEA">Sea</SelectItem>
                              <SelectItem value="AIRLINE">Airline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={handleAddShipVia}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Add Shipping Method
                  </Button>
                </div>
              </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : company ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}