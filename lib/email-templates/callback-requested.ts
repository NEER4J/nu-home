// Default templates for callback-requested email type

export function getDefaultCustomerCallbackRequestedTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Callback Request Confirmation</title>
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
                <h1 style="color: #1f2937; font-size: 28px; font-weight: 600; margin: 0;">Callback Request Received!</h1>
                <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Thank you for requesting a callback from {{companyName}}</p>
              </div>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
                We've received your callback request and our team will contact you within 24 hours to discuss your boiler installation requirements.
              </p>

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
                        <td style="padding: 12px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
                          <strong>Name:</strong> {{firstName}} {{lastName}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
                          <strong>Email:</strong> {{email}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
                          <strong>Phone:</strong> {{phone}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; font-size: 14px; color: #374151;">
                          <strong>Postcode:</strong> {{postcode}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="color: #0369a1; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">What happens next?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
                  <li>Our team will call you within 24 hours</li>
                  <li>We'll discuss your boiler installation requirements</li>
                  <li>We'll answer any questions you may have</li>
                  <li>We'll provide you with a detailed quote if you're interested</li>
                </ul>
              </div>

              <!-- Contact Information -->
              <div style="text-align: center; margin-bottom: 30px;">
                <p style="margin: 0 0 10px 0; font-size: 16px; color: #374151;">
                  If you have any urgent questions, please contact us:
                </p>
                <p style="margin: 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                  📞 {{companyPhone}} | ✉️ {{companyEmail}}
                </p>
              </div>

              <!-- Call to Action -->
              <div style="text-align: center;">
                <a href="{{quoteLink}}" style="display: inline-block; background: {{primaryColor}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Your Quote
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                This email was sent to {{email}} because you requested a callback from {{companyName}}.
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

export function getDefaultCustomerCallbackRequestedTextTemplate() {
  return `Callback Request Confirmation

Thank you for requesting a callback from {{companyName}}!

We've received your callback request and our team will contact you within 24 hours to discuss your boiler installation requirements.

Your Details:
- Name: {{firstName}} {{lastName}}
- Email: {{email}}
- Phone: {{phone}}
- Postcode: {{postcode}}

What happens next?
- Our team will call you within 24 hours
- We'll discuss your boiler installation requirements
- We'll answer any questions you may have
- We'll provide you with a detailed quote if you're interested

If you have any urgent questions, please contact us:
📞 {{companyPhone}} | ✉️ {{companyEmail}}

View Your Quote: {{quoteLink}}

This email was sent to {{email}} because you requested a callback from {{companyName}}.`
}

export function getDefaultAdminCallbackRequestedTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Callback Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626, #dc2626dd); padding: 25px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; font-size: 24px; font-weight: 600; margin: 0;">📞 New Callback Request</h1>
              <p style="color: #fecaca; font-size: 16px; margin: 8px 0 0 0;">A customer has requested a callback</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Customer Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Customer Details
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
                          <strong>Name:</strong> {{firstName}} {{lastName}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
                          <strong>Email:</strong> {{email}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
                          <strong>Phone:</strong> {{phone}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; font-size: 14px; color: #374151;">
                          <strong>Postcode:</strong> {{postcode}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Customer Notes -->
              {{#if callback.notes}}
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="color: #856404; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">📝 Customer Notes</h3>
                <p style="margin: 0; color: #856404; font-style: italic;">"{{callback.notes}}"</p>
              </div>
              {{/if}}

              <!-- Submission Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 15px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
                    Submission Details
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
                          <strong>Submission ID:</strong> {{submission.id}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
                          <strong>Requested At:</strong> {{callback.requested_at}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; font-size: 14px; color: #374151;">
                          <strong>Source:</strong> {{#if submission.is_iframe}}Embedded iframe{{else}}Direct website{{/if}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Required -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="color: #dc2626; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">⏰ Action Required</h3>
                <p style="margin: 0; color: #dc2626; font-weight: 600;">
                  Please call this customer within 24 hours to discuss their boiler installation requirements.
                </p>
              </div>

              <!-- Action Buttons -->
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="tel:{{phone}}" style="display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 10px;">
                  📞 Call Now
                </a>
                <a href="mailto:{{email}}" style="display: inline-block; background: #6b7280; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  📧 Email Customer
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                This callback request was submitted through your boiler installation quote system.<br>
                Submission ID: {{submission.id}} | {{submission.created_at}}
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

export function getDefaultAdminCallbackRequestedTextTemplate() {
  return `New Callback Request

A customer has requested a callback to discuss their boiler installation.

Customer Details:
- Name: {{firstName}} {{lastName}}
- Email: {{email}}
- Phone: {{phone}}
- Postcode: {{postcode}}

{{#if callback.notes}}
Customer Notes: "{{callback.notes}}"
{{/if}}

Submission Details:
- Submission ID: {{submission.id}}
- Requested At: {{callback.requested_at}}
- Source: {{#if submission.is_iframe}}Embedded iframe{{else}}Direct website{{/if}}

ACTION REQUIRED: Please call this customer within 24 hours to discuss their boiler installation requirements.

Contact Information:
- Phone: {{phone}}
- Email: {{email}}

This callback request was submitted through your boiler installation quote system.
Submission ID: {{submission.id}} | {{submission.created_at}}`
}
