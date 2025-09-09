// Default templates for save-quote email type

export function getDefaultCustomerSaveQuoteTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Saved Successfully</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: {{primaryColor}}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 60px; max-width: 200px; margin-bottom: 15px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Quote Saved Successfully!
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                Hi {{firstName}},
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Great news! Your boiler quote has been successfully saved. You can return anytime to complete your booking or make changes to your selection.
              </p>

              <!-- Quote Details -->
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Your Saved Quote</h3>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong> {{firstName}} {{lastName}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong> {{email}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Postcode:</strong> {{postcode}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Reference:</strong> {{refNumber}}</td>
                  </tr>
                </table>
              </div>

              <!-- Product Information -->
            
              <div> {{productInformation}}</div>

              <!-- Call to Action -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  View & Complete Your Quote
                </a>
              </div>

              <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you for choosing {{companyName}}! We're here whenever you're ready to proceed with your boiler installation.
              </p>

              <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                If you have any questions or need assistance, please don't hesitate to contact us.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Phone: {{companyPhone}}
              </p>
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Email: {{companyEmail}}
              </p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ©{{currentYear}} {{companyName}}. All rights reserved.
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

export function getDefaultCustomerSaveQuoteTextTemplate() {
  return `Quote Saved Successfully - {{companyName}}

Hi {{firstName}},

Great news! Your boiler quote has been successfully saved. You can return anytime to complete your booking or make changes to your selection.

Your Saved Quote:
Name: {{firstName}} {{lastName}}
Email: {{email}}
Postcode: {{postcode}}
Reference: {{refNumber}}

Selected Products:
{{quoteData}}

View & Complete Your Quote: {{quoteLink}}

Thank you for choosing {{companyName}}! We're here whenever you're ready to proceed with your boiler installation.

If you have any questions or need assistance, please don't hesitate to contact us.

Phone: {{companyPhone}}
Email: {{companyEmail}}

©{{currentYear}} {{companyName}}. All rights reserved.`
}

export function getDefaultAdminSaveQuoteTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Saved Quote - Follow Up</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #f59e0b; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 60px; max-width: 200px; margin-bottom: 15px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Customer Saved Quote - Follow Up
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                Great Follow-Up Opportunity!
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                A customer has saved their boiler quote - this is a great opportunity to follow up and help them complete their booking.
              </p>

              <!-- Customer Information -->
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Customer Information</h3>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong> {{firstName}} {{lastName}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong> {{email}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Postcode:</strong> {{postcode}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Reference:</strong> {{refNumber}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Date Saved:</strong> {{submissionDate}}</td>
                  </tr>
                </table>
              </div>

              <!-- Products Information -->
             <div> {{productInformation}}</div>

              <!-- Quote Link -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  View Customer Quote
                </a>
              </div>

              <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                This is an automated notification from {{companyName}}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ©{{currentYear}} {{companyName}}. All rights reserved.
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

export function getDefaultAdminSaveQuoteTextTemplate() {
  return `Customer Saved Quote - Follow Up - {{companyName}}

Great Follow-Up Opportunity!

A customer has saved their boiler quote - this is a great opportunity to follow up and help them complete their booking.

Customer Information:
Name: {{firstName}} {{lastName}}
Email: {{email}}
Postcode: {{postcode}}
Reference: {{refNumber}}
Date Saved: {{submissionDate}}

Selected Products:
{{productInformation}}

View Customer Quote: {{quoteLink}}

This is an automated notification from {{companyName}}.

©{{currentYear}} {{companyName}}. All rights reserved.`
}
