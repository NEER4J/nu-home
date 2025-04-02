"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString() || "partner";
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  // Sign up the user with Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        role: role,
      },
    },
  });

  if (authError) {
    console.error(authError.code + " " + authError.message);
    return encodedRedirect("error", "/sign-up", authError.message);
  }

  // If user is a partner, create a profile
  if (role === "partner" && authData?.user) {
    // Get additional form fields
    const companyName = formData.get("company_name")?.toString() || "";
    const contactPerson = formData.get("contact_person")?.toString() || "";
    const address = formData.get("address")?.toString() || "";
    const phone = formData.get("phone")?.toString() || "";
    const postcode = formData.get("postcode")?.toString() || "";
    const website = formData.get("website")?.toString() || "";
    const businessDescription = formData.get("business_description")?.toString() || "";
    const primaryCategory = formData.get("primary_category")?.toString() || "";

    // Create user profile
    const { error: profileError } = await supabase.from("UserProfiles").insert({
      user_id: authData.user.id,
      company_name: companyName,
      contact_person: contactPerson,
      address: address,
      phone: phone,
      postcode: postcode,
      status: "pending",
      website_url: website,
      business_description: businessDescription,
      role: role
    });

    if (profileError) {
      console.error("Profile creation error:", profileError.message);
      return encodedRedirect("error", "/sign-up", "Account created but profile setup failed. Please contact support.");
    }

    // Create category access request if primary category is selected
    if (primaryCategory) {
      const { error: categoryError } = await supabase.from("UserCategoryAccess").insert({
        user_id: authData.user.id,
        service_category_id: primaryCategory,
        status: "pending",
        is_primary: true
      });

      if (categoryError) {
        console.error("Category access error:", categoryError.message);
      }
    }

    // Create initial partner metrics
    if (primaryCategory) {
      await supabase.from("PartnerMetrics").insert({
        user_id: authData.user.id,
        service_category_id: primaryCategory
      }).then(null, (error) => {
        console.error("Partner metrics creation error:", error.message);
      });
    }

    // Send notification to admins about new partner
    await supabase.from("CategoryNotifications").insert({
      user_id: authData.user.id,
      service_category_id: primaryCategory,
      type: "new_partner",
      message: `New partner ${companyName} has registered and requested access to your category.`
    }).then(null, (error) => {
      console.error("Notification creation error:", error.message);
    });
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  // Get user profile to check role
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('UserProfiles')
    .select('role, status')
    .eq('user_id', user?.id)
    .single();

  // Redirect based on role and status
  if (profile?.role === 'admin') {
    return redirect('/admin');
  } else if (profile?.role === 'partner') {
    if (profile.status === 'pending') {
      return redirect('/partner/pending');
    } else if (profile.status === 'suspended') {
      return redirect('/partner/suspended');
    } else {
      return redirect('/partner');
    }
  }

  // Default redirect if no role found
  return redirect('/');
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

export async function handleLoginRedirect(role: string) {
  switch (role) {
    case 'admin':
      return redirect('/admin')
    case 'partner':
      return redirect('/partner')
    default:
      return redirect('/')
  }
}
