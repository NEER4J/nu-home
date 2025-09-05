// Default templates for checkout-monthly email type

export function getDefaultCustomerCheckoutMonthlyTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Payment Plan Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, {{primaryColor}}, {{primaryColor}}dd); padding: 25px 30px; border-radius: 8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; vertical-align: middle;">
                    <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 40px; max-width: 150px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; font-size: 28px; font-weight: 600; margin: 0;">Monthly Payment Plan Confirmed!</h1>
                <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Your boiler installation has been booked with {{companyName}}</p>
              </div>

              <!-- Customer Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Your Details
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Name:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{firstName}} {{lastName}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Email:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{email}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Phone:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{phone}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Postcode:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{postcode}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Reference:</td>
                        <td style="padding: 12px 15px; color: #6b7280;">{{submissionId}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Installation Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Installation Details
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #6b7280; line-height: 1.6;">
                    {{installationInfo}}
                  </td>
                </tr>
              </table>

              <!-- Order Summary Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Order Summary
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                    {{orderDetails}}
                  </td>
                </tr>
              </table>

              <!-- Payment Plan Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f0fdf4; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Payment Plan Details
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                    {{paymentPlanInfo}}
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
                Thank you for choosing {{companyName}}! We look forward to completing your installation.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 40px; max-width: 150px; margin-bottom: 10px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      ©{{currentYear}} {{companyName}}. All rights reserved.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.4;">
                      {{companyAddress}}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
                      {{companyName}} is authorised and regulated by the Financial Conduct Authority. Finance options are provided by panel of lenders. Finance available subject to status. Terms and conditions apply.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <div style="display: inline-block;">
                      <a href="#" style="color: {{primaryColor}}; text-decoration: none; margin: 0 10px; font-size: 14px;">Privacy Policy</a>
                      <span style="color: #9ca3af;">|</span>
                      <a href="#" style="color: {{primaryColor}}; text-decoration: none; margin: 0 10px; font-size: 14px;">Terms & Conditions</a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <a href="{{companyWebsite}}" style="color: {{primaryColor}}; text-decoration: none; font-size: 14px; font-weight: 600;">
                      Visit our website
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function getDefaultCustomerCheckoutMonthlyTextTemplate() {
  return `Monthly Payment Plan Confirmed - Your Boiler Installation with {{companyName}}

Hi {{firstName}},

Great news! Your monthly payment plan has been set up and your boiler installation is now booked.

Customer Details:
Name: {{firstName}} {{lastName}}
Email: {{email}}
Phone: {{phone}}
Postcode: {{postcode}}

{{installationInfo}}
Order Summary:
{{orderDetails}}

Payment Plan Details:
{{paymentPlanInfo}}

Booking Reference: {{submissionId}}
What happens next?
• We'll contact you within 24 hours to set up payment details
• Direct debit will be arranged for your monthly payments
• Our team will contact you 24-48 hours before installation
• Our certified engineers will arrive on your scheduled date
• Installation will be completed with full warranty

Thank you for choosing {{companyName}}!`
}

export function getDefaultAdminCheckoutMonthlyTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Payment Plan Booking - Admin</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="700" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, {{primaryColor}}, {{primaryColor}}dd); padding: 25px 30px; border-radius: 8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; vertical-align: middle;">
                    <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 40px; max-width: 150px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #374151;">
                New Monthly Payment Plan Booking
              </h2>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                A customer has confirmed their monthly payment plan for boiler installation with <strong>{{companyName}}</strong>. 
                Please set up the payment plan and schedule the installation.
              </p>

              <!-- Customer Information Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Customer Information
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Full Name:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{firstName}} {{lastName}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Email:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{email}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Phone:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{phone}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Postcode:</td>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{postcode}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; width: 35%; font-weight: 600; color: #374151; background-color: #f8f9fa;">Reference:</td>
                        <td style="padding: 12px 15px; color: #6b7280;">{{submissionId}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Installation Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Installation Details
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #6b7280; line-height: 1.6;">
                    {{installationInfo}}
                  </td>
                </tr>
              </table>

              <!-- Order Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Order Details
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                    {{orderDetails}}
                  </td>
                </tr>
              </table>

              <!-- Payment Plan Information Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f0fdf4; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Payment Plan Information
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                    {{paymentPlanInfo}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 40px; max-width: 150px; margin-bottom: 10px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      ©{{currentYear}} {{companyName}}. All rights reserved.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.4;">
                      {{companyAddress}}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
                      {{companyName}} is authorised and regulated by the Financial Conduct Authority. Finance options are provided by panel of lenders. Finance available subject to status. Terms and conditions apply.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <div style="display: inline-block;">
                      <a href="#" style="color: {{primaryColor}}; text-decoration: none; margin: 0 10px; font-size: 14px;">Privacy Policy</a>
                      <span style="color: #9ca3af;">|</span>
                      <a href="#" style="color: {{primaryColor}}; text-decoration: none; margin: 0 10px; font-size: 14px;">Terms & Conditions</a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <a href="{{companyWebsite}}" style="color: {{primaryColor}}; text-decoration: none; font-size: 14px; font-weight: 600;">
                      Visit our website
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function getDefaultAdminCheckoutMonthlyTextTemplate() {
  return `New Monthly Payment Plan Booking - {{companyName}}

A customer has confirmed their monthly payment plan for boiler installation.

Customer Information:
Name: {{firstName}} {{lastName}}
Email: {{email}}
Phone: {{phone}}
Postcode: {{postcode}}
Reference: {{submissionId}}

{{installationInfo}}
Order Details:
{{orderDetails}}

Payment Plan Information:
{{paymentPlanInfo}}

Action Required: Contact customer within 24 hours to set up direct debit and payment plan details.

This is an automated notification from {{companyName}}.`
}
