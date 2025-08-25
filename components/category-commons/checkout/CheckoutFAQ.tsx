'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, MessageCircle, Star } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "Can I get a new boiler on finance?",
    answer: "Yes, we offer flexible financing options for new boiler installations. You can spread the cost over 12, 24, or 36 months with competitive APR rates. We also offer 0% finance options for qualified customers. Our finance calculator will show you the exact monthly payments based on your chosen plan."
  },
  {
    question: "Do I need scaffolding to install a boiler?",
    answer: "In most cases, scaffolding is not required for boiler installation. Our Gas Safe registered engineers can typically access the boiler location using ladders or existing access points. However, if your boiler is in a hard-to-reach location (like a high wall or loft), we may recommend scaffolding for safety. We'll assess this during the initial survey and include any additional costs in your quote."
  },
  {
    question: "Is your calendar guaranteed after I've picked my date?",
    answer: "Yes, once you've selected and confirmed your installation date, it's guaranteed. We'll send you a confirmation email with all the details. Our team will also call you 24 hours before the installation to confirm the exact arrival time. If we need to reschedule for any reason, we'll give you at least 48 hours notice and offer alternative dates."
  },
  {
    question: "Who'll be installing my boiler?",
    answer: "Your boiler will be installed by our team of Gas Safe registered engineers who are fully qualified and experienced in boiler installations. All our engineers are employed directly by us (not subcontractors) and carry full insurance. They'll arrive in branded vehicles and will show you their Gas Safe ID cards before starting work."
  },
  {
    question: "What if I change my mind, or need to cancel?",
    answer: "You can cancel your booking up to 48 hours before your scheduled installation date without any charges. If you cancel within 48 hours, there may be a small cancellation fee to cover our preparation costs. If you need to reschedule, we're happy to help you find an alternative date that works for you."
  },
  {
    question: "Can I get finance with poor credit?",
    answer: "We work with multiple finance providers to offer options for customers with various credit histories. While we can't guarantee approval, we have specialist lenders who consider applications from customers with poor credit. Our application process is quick and won't affect your credit score. We'll always be transparent about the terms and conditions."
  },
  {
    question: "How long does it take to install a replacement boiler?",
    answer: "A typical boiler replacement takes 1-2 days to complete. On the first day, our engineers will remove the old boiler and install the new one. On the second day (if needed), they'll complete the commissioning and testing. The exact time depends on the complexity of your installation and whether any additional work is required. We'll give you a more specific timeframe during the survey."
  },
  {
    question: "When buying a new boiler through Heatable, am I protected?",
    answer: "Yes, you're fully protected when buying through us. All our boilers come with manufacturer warranties (typically 7-10 years) and we provide additional protection through our own warranty. We're also members of Gas Safe Register and carry full public liability insurance. Your payment is protected, and we're registered with relevant trade associations for your peace of mind."
  }
]

export default function CheckoutFAQ() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
          <Info className="w-4 h-4 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Help & info</h2>
      </div>

      {/* FAQ Items */}
      <div className="space-y-1">
        {faqData.map((item, index) => (
          <div key={index} className="border-b border-gray-100 last:border-b-0">
            <button
              onClick={() => toggleItem(index)}
              className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 pr-4">
                {item.question}
              </span>
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                {openItems.has(index) ? (
                  <ChevronUp className="w-3 h-3 text-gray-600" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-gray-600" />
                )}
              </div>
            </button>
            
            {openItems.has(index) && (
              <div className="pb-4 pr-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Ask a question link */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <MessageCircle className="w-4 h-4" />
          Ask a question
        </button>
      </div>

  
    </div>
  )
}
