'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { CreateUserForm } from '@/components/admin/CreateUserForm';
import { PasswordResetDialog } from '@/components/admin/PasswordResetDialog';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Mail, Phone, Shield, AlertCircle, CheckCircle, XCircle, Edit, Trash2, Crown, Key } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface AdminUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  role?: string;
  accountData?: {
    name?: string;
    phone_number?: string;
    status: 'active' | 'inactive' | 'suspended';
    allowed_login_methods: 'email_only' | 'phone_only' | 'both';
    created_by_admin_id?: string;
    created_at: string;
    updated_at: string;
  };
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    allowedLoginMethods: 'both' as 'email_only' | 'phone_only' | 'both'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await auth.admin.listUsers(1, 50);
      
      if (result.success) {
        setUsers(result.users);
      } else {
        toast.error('Failed to load users: ' + result.error);
      }
    } catch (error: any) {
      toast.error('Error loading users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = (newUser: any) => {
    loadUsers(); // Reload the users list
    setActiveTab('users'); // Switch to users tab
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getLoginMethodsBadge = (methods: string) => {
    switch (methods) {
      case 'both':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><Shield className="w-3 h-3 mr-1" />Both</Badge>;
      case 'email_only':
        return <Badge variant="outline"><Mail className="w-3 h-3 mr-1" />Email Only</Badge>;
      case 'phone_only':
        return <Badge variant="outline"><Phone className="w-3 h-3 mr-1" />Phone Only</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive" className="bg-purple-100 text-purple-800"><Crown className="w-3 h-3 mr-1" />Super Admin</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'user':
      default:
        return <Badge variant="outline"><Users className="w-3 h-3 mr-1" />User</Badge>;
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const result = await auth.admin.updateUserStatus(userId, newStatus);
      if (result.success) {
        toast.success('User status updated successfully');
        loadUsers();
      } else {
        toast.error('Failed to update user status: ' + result.error);
      }
    } catch (error: any) {
      toast.error('Error updating user status: ' + error.message);
    }
  };

  const handleUpdateLoginMethods = async (userId: string, methods: 'email_only' | 'phone_only' | 'both') => {
    try {
      const result = await auth.admin.toggleUserLoginMethods(userId, methods);
      if (result.success) {
        toast.success('Login methods updated successfully');
        loadUsers();
      } else {
        toast.error('Failed to update login methods: ' + result.error);
      }
    } catch (error: any) {
      toast.error('Error updating login methods: ' + error.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const result = await auth.admin.deleteUser(userToDelete.id);
      if (result.success) {
        toast.success('User deleted successfully');
        loadUsers();
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } else {
        toast.error('Failed to delete user: ' + result.error);
      }
    } catch (error: any) {
      toast.error('Error deleting user: ' + error.message);
    }
  };

  const openDeleteDialog = (user: AdminUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.accountData?.name || '',
      email: user.email || '',
      phone: user.accountData?.phone_number || '',
      status: user.accountData?.status || 'active',
      allowedLoginMethods: user.accountData?.allowed_login_methods || 'both'
    });
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          status: editForm.status,
          allowedLoginMethods: editForm.allowedLoginMethods,
          email: editForm.email,
          phone: editForm.phone
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('User updated successfully');
        loadUsers();
        setEditingUser(null);
      } else {
        toast.error('Failed to update user: ' + (result.error || 'Unknown error'));
      }
    } catch (error: any) {
      toast.error('Error updating user: ' + error.message);
    }
  };

  if (!user) {
    return <div>Please sign in to access the admin panel.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage user accounts, authentication methods, and permissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create User
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">Loading users...</div>
              </CardContent>
            </Card>
          ) : users.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No users found</h3>
                  <p className="text-muted-foreground mb-4">Get started by creating your first user account.</p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create User
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {users.map((adminUser) => (
                <Card key={adminUser.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {adminUser.accountData?.name || 'Unnamed User'}
                        </CardTitle>
                        <CardDescription>
                          Created: {new Date(adminUser.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {adminUser.accountData && getStatusBadge(adminUser.accountData.status)}
                        {adminUser.accountData && getLoginMethodsBadge(adminUser.accountData.allowed_login_methods)}
                        {getRoleBadge(adminUser.role || 'user')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Mail className="w-4 h-4" />
                          Email
                        </div>
                        <div className="font-medium">{adminUser.email || 'Not set'}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Phone className="w-4 h-4" />
                          Phone
                        </div>
                        <div className="font-medium">{adminUser.accountData?.phone_number || 'Not set'}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap items-center">
                      <select 
                        value={adminUser.accountData?.status || 'active'}
                        onChange={(e) => handleUpdateUserStatus(adminUser.id, e.target.value as any)}
                        className="px-3 py-1 text-sm border rounded"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                      
                      <select 
                        value={adminUser.accountData?.allowed_login_methods || 'both'}
                        onChange={(e) => handleUpdateLoginMethods(adminUser.id, e.target.value as any)}
                        className="px-3 py-1 text-sm border rounded"
                      >
                        <option value="both">Both Email & Phone</option>
                        <option value="email_only">Email Only</option>
                        <option value="phone_only">Phone Only</option>
                      </select>
                      
                      <div className="flex gap-1 ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPasswordResetUser(adminUser)}
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(adminUser)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(adminUser)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <CreateUserForm 
            onUserCreated={handleUserCreated}
            adminId={user.id}
          />
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email (Read-only)</Label>
              <Input
                id="edit-email"
                value={editForm.email}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone (Read-only)</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value: 'active' | 'inactive' | 'suspended') => 
                  setEditForm(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-methods">Allowed Login Methods</Label>
              <Select
                value={editForm.allowedLoginMethods}
                onValueChange={(value: 'email_only' | 'phone_only' | 'both') => 
                  setEditForm(prev => ({ ...prev, allowedLoginMethods: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both Email & Phone</SelectItem>
                  <SelectItem value="email_only">Email Only</SelectItem>
                  <SelectItem value="phone_only">Phone Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <PasswordResetDialog
        open={!!passwordResetUser}
        onOpenChange={(open) => !open && setPasswordResetUser(null)}
        user={passwordResetUser || { id: '', email: '', user_metadata: {} }}
        onSuccess={() => {
          loadUsers();
          setPasswordResetUser(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {userToDelete?.accountData?.name || userToDelete?.email}? 
              This action cannot be undone and will permanently remove the user account and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}