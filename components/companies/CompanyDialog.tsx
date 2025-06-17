'use client'

import { useEffect } from 'react'
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
import { supabase } from '@/lib/supabase/client'
// Define types manually since we're having issues with the database types import
import { toast } from 'sonner'
import { PlusCircle, Trash2 } from 'lucide-react'

// Define types manually since we're having issues with the database types import
type MyCompanyDB = {
  my_company_id?: string;
  my_company_name: string;
  my_company_code: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type CompanyDB = {
  company_id?: string;
  company_name: string;
  company_code?: string | null;
  company_type?: string | null;
  default_currency?: string | null;
  default_payment_term?: string | null;
  condition?: string | null;
  default_ship_account_no?: string | null;
  default_ship_via_company_name?: string | null;
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

const CONDITION_OPTIONS = ['AR', 'SVC', 'AS-IS', 'OHC', 'INS', 'REP', 'MOD'];
const CURRENCY_OPTIONS = ['USD', 'EURO', 'TL', 'GBP'];
const PAYMENT_TERM_OPTIONS = ['PRE-PAY', 'COD', 'NET5', 'NET10', 'NET15', 'NET30'];

// Form data types
type MyCompanyFormData = {
  my_company_name: string;
  my_company_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  country: string;
  zip_code: string;
  contact_name: string;
  phone: string;
  email?: string;
  // Add type discriminator
  formType: 'my_company';
};

type ExternalCompanyFormData = {
  company_name: string;
  company_code: string;
  company_type: 'vendor' | 'customer' | 'both';
  default_currency: string;
  default_payment_term: string;
  condition: string;
  default_ship_account_no?: string;
  default_ship_via_company_name?: string;
  company_contacts: CompanyContact[];
  company_addresses: CompanyAddress[];
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
  // Address fields
  address_line1: z.string().min(1, 'Address line 1 is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  zip_code: z.string().min(1, 'ZIP/Postal code is required'),
  // Contact fields
  contact_name: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
});

// Schema for External Company form
const externalCompanySchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_code: z.string().min(1, 'Company code is required'),
  company_type: z.enum(['vendor', 'customer', 'both']),
  default_currency: z.string().min(1, 'Currency is required'),
  default_payment_term: z.string().min(1, 'Payment term is required'),
  condition: z.string().min(1, 'Condition is required'),
  default_ship_account_no: z.string().optional(),
  default_ship_via_company_name: z.string().optional(),
  
  company_contacts: z.array(z.object({
    contact_id: z.string().optional(),
    contact_name: z.string().nullable().optional(),
    email: z.string().email('Invalid email').or(z.literal('')).optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
    is_primary: z.boolean().nullable().default(false),
  })).optional().default([]),
  
  company_addresses: z.array(z.object({
    address_id: z.string().optional(),
    address_line1: z.string().min(1, 'Address line 1 is required'),
    address_line2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    zip_code: z.string().optional(),
    is_primary: z.boolean().nullable().default(false),
  })).optional().default([]),
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

export function CompanyDialog({ open, onClose, company, type }: CompanyDialogProps) {
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
      address_line1: '',
      address_line2: '',
      city: '',
      country: '',
      zip_code: '',
      contact_name: '',
      phone: '',
      email: ''
    };
  }

  function getExternalCompanyDefaultValues(company?: CompanyDB): ExternalCompanyFormData {
    return {
      formType: 'external_company',
      company_name: company?.company_name || '',
      company_code: company?.company_code || '',
      company_type: (company?.company_type as 'vendor' | 'customer' | 'both') || 'vendor',
      default_currency: company?.default_currency || 'USD',
      default_payment_term: company?.default_payment_term || 'NET30',
      condition: company?.condition || 'AR',
      default_ship_account_no: company?.default_ship_account_no || '',
      default_ship_via_company_name: company?.default_ship_via_company_name || '',
      company_contacts: [],
      company_addresses: []
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

  const handleAddContact = () => {
    if (!isMyCompanyType) {
      appendContact({
        contact_id: uuidv4(),
        contact_name: '',
        email: '',
        phone: '',
        role: '',
        is_primary: false
      });
    }
  };

  const handleAddAddress = () => {
    if (!isMyCompanyType) {
      appendAddress({
        address_id: uuidv4(),
        address_line1: '',
        address_line2: '',
        city: '',
        country: '',
        zip_code: '',
        is_primary: false
      });
    }
  };

  // Set default values when the company or type changes
  useEffect(() => {
    if (company) {
      // Transform company data to match form data structure
      if (isMyCompanyType) {
        form.reset({
          ...(company as MyCompanyDB),
          formType: 'my_company'
        });
      } else {
        const companyData = company as CompanyDB;
        form.reset({
          company_name: companyData.company_name,
          company_code: companyData.company_code ?? '',
          company_type: (companyData.company_type ?? 'vendor') as 'vendor' | 'customer' | 'both',
          default_currency: companyData.default_currency || 'USD',
          default_payment_term: companyData.default_payment_term || 'NET30',
          condition: companyData.condition || 'AR',
          default_ship_account_no: companyData.default_ship_account_no || undefined,
          default_ship_via_company_name: companyData.default_ship_via_company_name || undefined,
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
          formType: 'external_company'
        });
      }
    } else {
      form.reset(isMyCompanyType ? getMyCompanyDefaultValues() : getExternalCompanyDefaultValues());
    }
  }, [company, isMyCompanyType, form]);

  const onSubmit = async (formData: FormData) => {
    try {
      if (isMyCompanyFormData(formData)) {
        // Handle My Company form submission
        const { formType, ...companyData } = formData;
        
        if (isMyCompany(company)) {
          // Update existing my_company
          const { error } = await supabase
            .from('my_companies')
            .update(companyData)
            .eq('my_company_id', company.my_company_id);
          
          if (error) throw error;
          toast.success('My Company updated successfully');
        } else {
          // Create new my_company
          const { error } = await supabase
            .from('my_companies')
            .insert(companyData);
            
          if (error) throw error;
          toast.success('My Company created successfully');
        }
      } else if (isExternalCompanyFormData(formData)) {
        // Handle External Company form submission
        const { formType, ...companyData } = formData;
        
        if (isExternalCompany(company)) {
          // Update existing company
          const { error } = await supabase
            .from('companies')
            .update({
              company_name: companyData.company_name,
              company_code: companyData.company_code,
              company_type: companyData.company_type,
              default_currency: companyData.default_currency,
              default_payment_term: companyData.default_payment_term,
              condition: companyData.condition,
              default_ship_account_no: companyData.default_ship_account_no,
              default_ship_via_company_name: companyData.default_ship_via_company_name
            })
            .eq('company_id', company.company_id);
            
          if (error) throw error;
          
          // Handle company contacts
          if (companyData.company_contacts.length > 0) {
            const contactsToInsert = companyData.company_contacts.map(contact => ({
              ...contact,
              company_id: company.company_id,
              company_ref_type: 'companies'
            }));
            
            const { error: contactsError } = await supabase
              .from('company_contacts')
              .upsert(contactsToInsert);
              
            if (contactsError) throw contactsError;
          }
          
          // Handle company addresses
          if (companyData.company_addresses.length > 0) {
            const addressesToInsert = companyData.company_addresses.map(address => ({
              ...address,
              company_id: company.company_id,
              company_ref_type: 'companies'
            }));
            
            const { error: addressesError } = await supabase
              .from('company_addresses')
              .upsert(addressesToInsert);
              
            if (addressesError) throw addressesError;
          }
          
          toast.success('Company updated successfully');
        } else {
          // Create new company
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({
              company_name: companyData.company_name,
              company_code: companyData.company_code,
              company_type: companyData.company_type,
              default_currency: companyData.default_currency,
              default_payment_term: companyData.default_payment_term,
              condition: companyData.condition,
              default_ship_account_no: companyData.default_ship_account_no,
              default_ship_via_company_name: companyData.default_ship_via_company_name
            })
            .select()
            .single();
            
          if (companyError) throw companyError;
          
          // Handle company contacts
          if (companyData.company_contacts.length > 0) {
            const contactsToInsert = companyData.company_contacts.map(contact => ({
              ...contact,
              company_id: newCompany.company_id,
              company_ref_type: 'companies'
            }));
            
            const { error: contactsError } = await supabase
              .from('company_contacts')
              .insert(contactsToInsert);
              
            if (contactsError) throw contactsError;
          }
          
          // Handle company addresses
          if (companyData.company_addresses.length > 0) {
            const addressesToInsert = companyData.company_addresses.map(address => ({
              ...address,
              company_id: newCompany.company_id,
              company_ref_type: 'companies'
            }));
            
            const { error: addressesError } = await supabase
              .from('company_addresses')
              .insert(addressesToInsert);
              
            if (addressesError) throw addressesError;
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Company Name</Label>
              <Input {...form.register(isMyCompanyType ? 'my_company_name' : 'company_name')} />
            </div>
            <div>
              <Label>Company Code</Label>
              <Input {...form.register(isMyCompanyType ? 'my_company_code' : 'company_code')} />
            </div>
          </div>

          {!isMyCompanyType && (
            <div>
              <Label>Company Type</Label>
              <Select
                value={form.watch('company_type')}
                onValueChange={(value) => form.setValue('company_type', value as 'vendor' | 'customer' | 'both')}
              >
                <SelectTrigger id="company_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="default_currency">Currency</Label>
            <Select onValueChange={(value) => form.setValue('default_currency', value)} defaultValue={form.watch('default_currency')}>
              <SelectTrigger id="default_currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="default_payment_term">Payment Term</Label>
            <Select onValueChange={(value) => form.setValue('default_payment_term', value)} defaultValue={form.watch('default_payment_term')}>
              <SelectTrigger id="default_payment_term">
                <SelectValue placeholder="Select payment term" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERM_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select onValueChange={(value) => form.setValue('condition', value)} defaultValue={form.watch('condition')}>
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isMyCompanyType ? (
            // Form fields for MyCompany
            <>
             <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Address</Label>
                  <Input {...form.register('company_addresses.0.address_line1' as const)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <Label>Zip Code</Label>
                  <Input {...form.register('company_addresses.0.zip_code' as const)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input {...form.register('company_addresses.0.city' as const)} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input {...form.register('company_addresses.0.country' as const)} />
                </div>
                 <div>
                  <Label>Contact Name</Label>
                  <Input {...form.register('company_contacts.0.contact_name' as const)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input {...form.register('company_contacts.0.phone' as const)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" {...form.register('company_contacts.0.email' as const)} />
                </div>
              </div>
            </>
          ) : (
            // Form fields for ExternalCompany with dynamic contacts and addresses
            <>
              {/* Contacts Section */}
              <div className="space-y-4 rounded-md border p-4">
                <h3 className="text-lg font-medium">Contacts</h3>
                {contactFields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(index)}><Trash2 className="h-4 w-4" /></Button>
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
                <Button type="button" variant="outline" onClick={() => appendContact({ 
                  contact_name: '', 
                  email: '', 
                  phone: '',
                  role: '',
                  is_primary: false
                })}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Contact
                </Button>
              </div>

              {/* Addresses Section */}
              <div className="space-y-4 rounded-md border p-4">
                <h3 className="text-lg font-medium">Addresses</h3>
                {addressFields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-md border p-3">
                     <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)}><Trash2 className="h-4 w-4" /></Button>
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
                <Button type="button" variant="outline" onClick={() => appendAddress({
                  address_line1: '',
                  address_line2: '',
                  city: '',
                  country: '',
                  zip_code: '',
                  is_primary: false
                })}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Address
                </Button>
              </div>
            </>
          )}

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