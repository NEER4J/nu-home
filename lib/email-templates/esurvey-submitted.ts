// Default templates for esurvey-submitted email type

export function getDefaultCustomerESurveySubmittedTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eSurvey Submitted Successfully</title>
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
                <h1 style="color: #1f2937; font-size: 28px; font-weight: 600; margin: 0;">eSurvey Submitted!</h1>
                <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Thank you for submitting your photos with {{companyName}}</p>
              </div>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6; text-align: center;">
                We've received your photos and our team will review them carefully. This will help us provide you with a more accurate quote for your boiler installation.
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
                  <li>Our team will review your photos within 24 hours</li>
                  <li>We'll contact you to discuss your requirements in more detail</li>
                  <li>You'll receive a detailed quote based on your specific setup</li>
                  <li>We'll arrange a convenient time for installation if you proceed</li>
                </ul>
              </div>

              <!-- Contact Information -->
              <div style="text-align: center; margin-bottom: 30px;">
                <p style="margin: 0 0 10px 0; font-size: 16px; color: #374151;">
                  If you have any questions, please don't hesitate to contact us:
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
            <td style="background-color: #f9fafb; padding: 25px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
                Thank you for choosing {{companyName}}
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This email was sent to {{email}}. If you have any questions, please contact us.
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

export function getDefaultCustomerESurveySubmittedTextTemplate() {
  return `eSurvey Submitted Successfully - {{companyName}}

Dear {{firstName}} {{lastName}},

Thank you for submitting your photos with {{companyName}}. We've received your eSurvey and our team will review it carefully.

Your Details:
- Name: {{firstName}} {{lastName}}
- Email: {{email}}
- Phone: {{phone}}
- Postcode: {{postcode}}

What happens next?
- Our team will review your photos within 24 hours
- We'll contact you to discuss your requirements in more detail
- You'll receive a detailed quote based on your specific setup
- We'll arrange a convenient time for installation if you proceed

If you have any questions, please don't hesitate to contact us:
📞 {{companyPhone}} | ✉️ {{companyEmail}}

View Your Quote: {{quoteLink}}

Thank you for choosing {{companyName}}

This email was sent to {{email}}. If you have any questions, please contact us.`
}

export function getDefaultAdminESurveySubmittedTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New eSurvey Submission - {{companyName}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, {{primaryColor}}, {{primaryColor}}dd); padding: 25px 30px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; font-size: 24px; font-weight: 600; margin: 0; text-align: center;">
                New eSurvey Submission
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0;">Customer has submitted photos</h2>
                <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Review the photos and contact the customer</p>
              </div>

              <!-- Customer Information -->
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
                          <strong>Submission ID:</strong> {{submissionId}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
                          <strong>Category:</strong> {{category}}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; font-size: 14px; color: #374151;">
                          <strong>Submitted:</strong> {{submissionDate}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Photos Information -->
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="color: #0369a1; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">Photos Submitted</h3>
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                  The customer has uploaded photos to help with the quote. Please review the photos in your admin panel and contact the customer to discuss their requirements.
                </p>
              </div>

              <!-- Action Required -->
              <div style="text-align: center; margin-bottom: 30px;">
                <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
                  <strong>Action Required:</strong> Review photos and contact customer
                </p>
                <div style="display: inline-block; background: {{primaryColor}}; color: white; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Contact: {{phone}} | {{email}}
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                This eSurvey was submitted through your {{companyName}} quote system.
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

export function getDefaultAdminESurveySubmittedTextTemplate() {
  return `New eSurvey Submission - {{companyName}}

Customer has submitted photos for review.

Customer Information:
- Name: {{firstName}} {{lastName}}
- Email: {{email}}
- Phone: {{phone}}
- Postcode: {{postcode}}

Submission Details:
- Submission ID: {{submissionId}}
- Category: {{category}}
- Submitted: {{submissionDate}}

Photos Submitted:
The customer has uploaded photos to help with the quote. Please review the photos in your admin panel and contact the customer to discuss their requirements.

Action Required: Review photos and contact customer
Contact: {{phone}} | {{email}}

This eSurvey was submitted through your {{companyName}} quote system.`
}