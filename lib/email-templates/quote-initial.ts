// Default templates for quote-initial email type

export function getDefaultCustomerTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Request</title>
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
              <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0;">Hi {{firstName}},</h1>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for requesting a quote. We've received your information and will be in touch shortly.
              </p>
              
              <!-- Details Table -->
              <table width="100%" cellpadding="12" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold; width: 35%;">Reference:</td>
                  <td>{{refNumber}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Name:</td>
                  <td>{{firstName}} {{lastName}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Email:</td>
                  <td>{{email}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Phone:</td>
                  <td>{{phone}}</td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Your Quote
                </a>
              </div>
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

export function getDefaultCustomerTextTemplate() {
  return `Hi {{firstName}},

Thank you for requesting a quote. We've received your information and will be in touch shortly.

Your Details:
Reference: {{refNumber}}
Name: {{firstName}} {{lastName}}
Email: {{email}}
Phone: {{phone}}

View your quote: {{quoteLink}}

Best regards,
{{companyName}}

© {{currentYear}} {{companyName}}. All rights reserved.
Visit our website: {{companyWebsite}}`
}

export function getDefaultAdminTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Quote Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, {{primaryColor}}, {{primaryColor}}dd); padding: 25px 30px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0; text-align: center;">New Quote Request</h2>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h3 style="color: #1f2937; margin: 0 0 20px 0;">Customer Information</h3>
              
              <!-- Customer Details -->
              <table width="100%" cellpadding="10" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold; width: 35%;">Reference:</td>
                  <td>{{refNumber}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Name:</td>
                  <td>{{firstName}} {{lastName}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Email:</td>
                  <td>{{email}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Phone:</td>
                  <td>{{phone}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Postcode:</td>
                  <td>{{postcode}}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; font-weight: bold;">Submission Date:</td>
                  <td>{{submissionDate}}</td>
                </tr>
              </table>
              
              <h3 style="color: #1f2937; margin: 30px 0 20px 0;">Quote Details</h3>
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
                {{quoteData}}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This is an automated notification from {{companyName}}
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

export function getDefaultAdminTextTemplate() {
  return `New Quote Request

Customer Information:
Reference: {{refNumber}}
Name: {{firstName}} {{lastName}}
Email: {{email}}
Phone: {{phone}}
Postcode: {{postcode}}
Submission Date: {{submissionDate}}

Quote Details:
{{quoteData}}

This is an automated notification from {{companyName}}`
}
