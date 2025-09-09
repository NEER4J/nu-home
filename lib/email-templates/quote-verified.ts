// Default templates for quote-verified email type

export function getDefaultCustomerVerifiedTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Verified</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, {{primaryColor}}, {{primaryColor}}dd); padding: 25px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 40px; max-width: 150px;">
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0;">Great news, {{firstName}}!</h1>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your quote has been verified and you can now proceed to view your boiler options and pricing.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                What happens next?
              </p>
              
              <div style="margin-bottom: 30px;">
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Browse our range of boiler options and pricing
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Select the perfect boiler for your home
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Choose your preferred installation date
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Complete your booking with secure payment
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Our certified engineers will handle the installation
                </p>
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                  ✓ Enjoy your new efficient heating system
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Your Boiler Options
                </a>
              </div>
              
              <p style="margin: 30px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6;">
                Thank you for choosing {{companyName}}!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                © {{currentYear}} {{companyName}}. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0;">
                <a href="{{companyWebsite}}" style="color: {{primaryColor}}; text-decoration: none;">Visit our website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function getDefaultCustomerVerifiedTextTemplate() {
  return `Great news, {{firstName}}!

Your quote has been verified and you can now proceed to view your boiler options and pricing.

What happens next?
✓ Browse our range of boiler options and pricing
✓ Select the perfect boiler for your home
✓ Choose your preferred installation date
✓ Complete your booking with secure payment
✓ Our certified engineers will handle the installation
✓ Enjoy your new efficient heating system

View your boiler options: {{quoteLink}}

Thank you for choosing {{companyName}}!

© {{currentYear}} {{companyName}}. All rights reserved.
Visit our website: {{companyWebsite}}`
}

export function getDefaultAdminVerifiedTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Verified - Customer Ready</title>
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
                Quote Verified - Customer Ready
              </h2>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                A customer has completed phone verification and is ready to proceed with booking.
              </p>

              <!-- Customer Details Table -->
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
                        <td style="padding: 12px 15px; color: #6b7280;">{{refNumber}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #0c4a6e; text-align: center;">
                  Status: Ready to Proceed
                </h3>
                <p style="margin: 0; font-size: 16px; color: #0c4a6e; text-align: center; line-height: 1.6;">
                  Customer phone verification completed successfully. Ready to view products and proceed with booking.
                </p>
              </div>
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
                      ©2025 {{companyName}}. All rights reserved.
                    </p>
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

export function getDefaultAdminVerifiedTextTemplate() {
  return `Quote Verified - Customer Ready

Customer Information:
Name: {{firstName}} {{lastName}}
Email: {{email}}
Phone: {{phone}}
Postcode: {{postcode}}
Reference: {{refNumber}}

Status: Customer phone verification completed successfully. Ready to view products and proceed with booking.

This is an automated notification from {{companyName}}`
}
