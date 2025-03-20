"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Original sign-up action (keep for backwards compatibility)
export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

// Enhanced sign-up action with role support
export const enhancedSignUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password || !role) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email, password, and account type are required",
    );
  }

  // Validate role
  if (role !== 'admin' && role !== 'partner') {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Invalid account type selected",
    );
  }

  try {
    // First, create the user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          role: role // Store role in auth.users.user_metadata
        }
      },
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error("User creation failed");
    }

    const userId = authData.user.id;

    // Second, create user profile
    const profileData: any = {
      user_id: userId,
      role: role,
      status: 'pending', // All new accounts start as pending
      is_approved: role === 'admin' ? true : false, // Auto-approve admins (you can change this)
    };

    // For partners, collect additional information
    if (role === 'partner') {
      profileData.company_name = formData.get("company_name")?.toString() || null;
      profileData.contact_person = formData.get("contact_person")?.toString() || null;
      profileData.phone = formData.get("phone")?.toString() || null;
      profileData.postcode = formData.get("postcode")?.toString() || null;
    }

    const { error: profileError } = await supabase
      .from('UserProfiles')
      .insert([profileData]);

    if (profileError) {
      throw profileError;
    }

    // For partners, set up their primary category access
    if (role === 'partner') {
      const primaryCategoryId = formData.get("primary_category")?.toString();
      
      if (primaryCategoryId) {
        const { error: categoryError } = await supabase
          .from('UserCategoryAccess')
          .insert([{
            user_id: userId,
            service_category_id: primaryCategoryId,
            status: 'pending', // Requires admin approval
            is_primary: true
          }]);

        if (categoryError) {
          throw categoryError;
        }
      }
    }

    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );

  } catch (error: any) {
    console.error('Sign-up error:', error);
    return encodedRedirect("error", "/sign-up", error.message);
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  // Get user profile to determine where to redirect
  const { data: profile } = await supabase
    .from('UserProfiles')
    .select('role, is_approved, status')
    .eq('user_id', data.user.id)
    .single();

  // If profile doesn't exist, create a default one
  if (!profile) {
    // This handles legacy users or users created through other means
    const { error: profileError } = await supabase
      .from('UserProfiles')
      .insert([{
        user_id: data.user.id,
        role: 'admin', // Default role for existing users
        is_approved: true,
        status: 'active'
      }]);

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    return redirect("/admin");
  }

  // Check if account is approved
  if (!profile.is_approved || profile.status !== 'active') {
    await supabase.auth.signOut();
    return encodedRedirect(
      "error", 
      "/sign-in", 
      "Your account is not activated yet. Please contact support."
    );
  }

  // Redirect based on role
  if (profile.role === 'partner') {
    return redirect("/partner");
  } else {
    return redirect("/admin");
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};


// Approve a partner account
export async function approvePartnerAction(formData: FormData) {
  try {
    const profileId = formData.get('profile_id')?.toString();
    
    if (!profileId) {
      return encodedRedirect('error', '/admin/partners', 'Profile ID is required');
    }
    
    const supabase = await createClient();
    
    // Update the partner's profile
    const { error: profileError } = await supabase
      .from('UserProfiles')
      .update({
        is_approved: true,
        status: 'active'
      })
      .eq('profile_id', profileId);
    
    if (profileError) {
      throw new Error(`Failed to update partner profile: ${profileError.message}`);
    }
    
    revalidatePath('/admin/partners');
    return redirect('/admin/partners');
    
  } catch (error: any) {
    console.error('Error approving partner:', error);
    return encodedRedirect('error', '/admin/partners', error.message || 'Failed to approve partner');
  }
}

// Suspend a partner account
export async function suspendPartnerAction(formData: FormData) {
  try {
    const profileId = formData.get('profile_id')?.toString();
    
    if (!profileId) {
      return encodedRedirect('error', '/admin/partners', 'Profile ID is required');
    }
    
    const supabase = await createClient();
    
    // Update the partner's profile
    const { error: profileError } = await supabase
      .from('UserProfiles')
      .update({
        status: 'suspended'
      })
      .eq('profile_id', profileId);
    
    if (profileError) {
      throw new Error(`Failed to suspend partner: ${profileError.message}`);
    }
    
    revalidatePath('/admin/partners');
    return redirect('/admin/partners');
    
  } catch (error: any) {
    console.error('Error suspending partner:', error);
    return encodedRedirect('error', '/admin/partners', error.message || 'Failed to suspend partner');
  }
}

// Reactivate a suspended partner account
export async function reactivatePartnerAction(formData: FormData) {
  try {
    const profileId = formData.get('profile_id')?.toString();
    
    if (!profileId) {
      return encodedRedirect('error', '/admin/partners', 'Profile ID is required');
    }
    
    const supabase = await createClient();
    
    // Update the partner's profile
    const { error: profileError } = await supabase
      .from('UserProfiles')
      .update({
        status: 'active'
      })
      .eq('profile_id', profileId);
    
    if (profileError) {
      throw new Error(`Failed to reactivate partner: ${profileError.message}`);
    }
    
    revalidatePath('/admin/partners');
    return redirect('/admin/partners');
    
  } catch (error: any) {
    console.error('Error reactivating partner:', error);
    return encodedRedirect('error', '/admin/partners', error.message || 'Failed to reactivate partner');
  }
}

// Approve a category access request
export async function approveCategoryRequest(formData: FormData) {
  try {
    const accessId = formData.get('access_id')?.toString();
    
    if (!accessId) {
      return encodedRedirect('error', '/admin/partners/requests', 'Access ID is required');
    }
    
    const supabase = await createClient();
    
    // Update the category access record
    const { error: accessError } = await supabase
      .from('UserCategoryAccess')
      .update({
        status: 'approved'
      })
      .eq('access_id', accessId);
    
    if (accessError) {
      throw new Error(`Failed to approve category request: ${accessError.message}`);
    }
    
    revalidatePath('/admin/partners/requests');
    return redirect('/admin/partners/requests');
    
  } catch (error: any) {
    console.error('Error approving category request:', error);
    return encodedRedirect('error', '/admin/partners/requests', error.message || 'Failed to approve category request');
  }
}

// Reject a category access request
export async function rejectCategoryRequest(formData: FormData) {
  try {
    const accessId = formData.get('access_id')?.toString();
    
    if (!accessId) {
      return encodedRedirect('error', '/admin/partners/requests', 'Access ID is required');
    }
    
    const supabase = await createClient();
    
    // Update the category access record
    const { error: accessError } = await supabase
      .from('UserCategoryAccess')
      .update({
        status: 'rejected'
      })
      .eq('access_id', accessId);
    
    if (accessError) {
      throw new Error(`Failed to reject category request: ${accessError.message}`);
    }
    
    revalidatePath('/admin/partners/requests');
    return redirect('/admin/partners/requests');
    
  } catch (error: any) {
    console.error('Error rejecting category request:', error);
    return encodedRedirect('error', '/admin/partners/requests', error.message || 'Failed to reject category request');
  }
}

// Partner action to request a new category
export async function requestCategoryAccess(formData: FormData) {
  try {
    const categoryId = formData.get('category_id')?.toString();
    const userId = formData.get('user_id')?.toString();
    const isPrimary = formData.get('is_primary') === 'on';
    
    if (!categoryId || !userId) {
      return encodedRedirect('error', '/partner/categories', 'Category ID and User ID are required');
    }
    
    const supabase = await createClient();
    
    // Check if a request already exists
    const { data: existingRequest, error: checkError } = await supabase
      .from('UserCategoryAccess')
      .select('*')
      .eq('user_id', userId)
      .eq('service_category_id', categoryId)
      .not('status', 'eq', 'rejected');
    
    if (checkError) {
      throw new Error(`Failed to check existing requests: ${checkError.message}`);
    }
    
    if (existingRequest && existingRequest.length > 0) {
      return encodedRedirect('error', '/partner/categories', 'You already have access or a pending request for this category');
    }
    
    // If making this the primary category, update any existing primary
    if (isPrimary) {
      const { error: updateError } = await supabase
        .from('UserCategoryAccess')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
      
      if (updateError) {
        console.error('Error updating primary category status:', updateError);
        // Continue anyway, not critical
      }
    }
    
    // Create the new category access request
    const { error: insertError } = await supabase
      .from('UserCategoryAccess')
      .insert({
        user_id: userId,
        service_category_id: categoryId,
        status: 'pending',
        is_primary: isPrimary
      });
    
    if (insertError) {
      throw new Error(`Failed to create category access request: ${insertError.message}`);
    }
    
    revalidatePath('/partner/categories');
    return redirect('/partner/categories?success=Category access request submitted successfully');
    
  } catch (error: any) {
    console.error('Error requesting category access:', error);
    return encodedRedirect('error', '/partner/categories', error.message || 'Failed to request category access');
  }
}

function revalidatePath(arg0: string) {
  throw new Error("Function not implemented.");
}
