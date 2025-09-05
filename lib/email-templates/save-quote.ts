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
              {{#if logoUrl}}
                <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 60px; max-width: 200px; margin-bottom: 15px;">
              {{/if}}
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
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Your Quote Details</h3>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong> {{firstName}} {{lastName}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong> {{email}}</td>
                  </tr>
                  {{#if postcode}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Postcode:</strong> {{postcode}}</td>
                  </tr>
                  {{/if}}
                  {{#if refNumber}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Reference:</strong> {{refNumber}}</td>
                  </tr>
                  {{/if}}
                </table>
              </div>

              {{#if quoteInfo}}
              <!-- Products Information -->
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">Saved Products & Options</h3>
                <div style="color: #92400e; font-size: 14px; line-height: 1.6; white-space: pre-line;">{{quoteInfo}}</div>
              </div>
              {{/if}}

              <!-- Benefits Section -->
              <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px;">Your Quote Benefits</h3>
                <ul style="margin: 0; padding-left: 20px; color: #065f46; font-size: 14px; line-height: 1.6;">
                  <li>Quote saved for 30 days - no pressure to decide now</li>
                  <li>Prices locked in at current rates</li>
                  <li>Easy to return and complete your booking</li>
                  <li>Modify your selection anytime before booking</li>
                  <li>Professional installation included</li>
                  <li>Full warranty and aftercare support</li>
                </ul>
              </div>

              <!-- Call to Action -->
              {{#if quoteLink}}
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  View & Complete Your Quote
                </a>
              </div>
              {{/if}}

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
              {{#if companyPhone}}
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Phone: {{companyPhone}}
              </p>
              {{/if}}
              {{#if companyEmail}}
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Email: {{companyEmail}}
              </p>
              {{/if}}
              {{#if companyAddress}}
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                {{companyAddress}}
              </p>
              {{/if}}
              {{#if companyWebsite}}
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Website: {{companyWebsite}}
              </p>
              {{/if}}
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ©2025 {{companyName}}. All rights reserved.
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

Your Quote Details:
Name: {{firstName}} {{lastName}}
Email: {{email}}
{{#if postcode}}Postcode: {{postcode}}{{/if}}
{{#if refNumber}}Reference: {{refNumber}}{{/if}}

{{#if quoteInfo}}Saved Products & Options:
{{quoteInfo}}

{{/if}}Your Quote Benefits:
• Quote saved for 30 days - no pressure to decide now
• Prices locked in at current rates
• Easy to return and complete your booking
• Modify your selection anytime before booking
• Professional installation included
• Full warranty and aftercare support

{{#if quoteLink}}View & Complete Your Quote: {{quoteLink}}

{{/if}}Thank you for choosing {{companyName}}! We're here whenever you're ready to proceed with your boiler installation.

If you have any questions or need assistance, please don't hesitate to contact us.

{{#if companyPhone}}Phone: {{companyPhone}}{{/if}}
{{#if companyEmail}}Email: {{companyEmail}}{{/if}}
{{#if companyAddress}}{{companyAddress}}{{/if}}
{{#if companyWebsite}}Website: {{companyWebsite}}{{/if}}

©2025 {{companyName}}. All rights reserved.`
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
              {{#if logoUrl}}
                <img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 60px; max-width: 200px; margin-bottom: 15px;">
              {{/if}}
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
                  {{#if postcode}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Postcode:</strong> {{postcode}}</td>
                  </tr>
                  {{/if}}
                  {{#if refNumber}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Reference:</strong> {{refNumber}}</td>
                  </tr>
                  {{/if}}
                  <tr>
                    <td style="padding: 5px 0; color: #4b5563; font-size: 14px;"><strong>Date Saved:</strong> {{submissionDate}}</td>
                  </tr>
                </table>
              </div>

              {{#if quoteInfo}}
              <!-- Products Information -->
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">Saved Products & Options</h3>
                <div style="color: #92400e; font-size: 14px; line-height: 1.6; white-space: pre-line;">{{quoteInfo}}</div>
              </div>
              {{/if}}

              <!-- Action Required -->
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px;">Action Required</h3>
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                  <strong>Contact customer within 24-48 hours</strong> to help convert the quote into a booking. 
                  This is a high conversion opportunity - the customer has shown strong interest by saving their quote.
                </p>
              </div>

              <!-- Follow-up Tips -->
              <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px;">Follow-up Tips</h3>
                <ul style="margin: 0; padding-left: 20px; color: #065f46; font-size: 14px; line-height: 1.6;">
                  <li>Call or email to answer any questions they may have</li>
                  <li>Offer to schedule a convenient installation date</li>
                  <li>Highlight any current promotions or incentives</li>
                  <li>Provide additional information about your services</li>
                  <li>Offer a free consultation or site visit</li>
                </ul>
              </div>

              {{#if quoteLink}}
              <!-- Quote Link -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{quoteLink}}" style="display: inline-block; background-color: {{primaryColor}}; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  View Customer Quote
                </a>
              </div>
              {{/if}}

              <p style="margin: 20px 0 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                This is an automated notification from {{companyName}}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ©2025 {{companyName}}. All rights reserved.
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
{{#if postcode}}Postcode: {{postcode}}{{/if}}
{{#if refNumber}}Reference: {{refNumber}}{{/if}}
Date Saved: {{submissionDate}}

{{#if quoteInfo}}Saved Products & Options:
{{quoteInfo}}

{{/if}}Action Required:
Contact customer within 24-48 hours to help convert the quote into a booking. This is a high conversion opportunity - the customer has shown strong interest by saving their quote.

Follow-up Tips:
• Call or email to answer any questions they may have
• Offer to schedule a convenient installation date
• Highlight any current promotions or incentives
• Provide additional information about your services
• Offer a free consultation or site visit

{{#if quoteLink}}View Customer Quote: {{quoteLink}}

{{/if}}This is an automated notification from {{companyName}}.

©2025 {{companyName}}. All rights reserved.`
}
