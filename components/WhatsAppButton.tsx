'use client'

import { useEffect, useState } from 'react'
import { storeConfig } from '@/lib/config'
import { trackEvent } from '@/lib/analytics'
import { buildTenantWhatsAppUrl, tenantConfig } from '@/lib/tenant.config'

const WA_NUMBER = tenantConfig.contact.whatsappNumber
const WA_MESSAGE = `Hi ${storeConfig.brandName}! ${tenantConfig.marketing.whatsapp.productQuestionMessage}`
const WA_URL = buildTenantWhatsAppUrl(WA_MESSAGE)

export default function WhatsAppButton() {
  const [hovered, setHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (!WA_NUMBER) return null

  const showLabel = hovered || isMobile

  return (
    <a
      className="whatsAppFloatingButton"
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      onClick={() => trackEvent('whatsapp_order_click', { location: isMobile ? 'mobile-floating' : 'desktop-floating' })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        bottom: isMobile ? '16px' : '28px',
        left: isMobile ? '14px' : '28px',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'var(--tenant-whatsapp)',
        color: '#FFFFFF',
        borderRadius: '999px',
        padding: showLabel ? '12px 16px 12px 14px' : '13px',
        textDecoration: 'none',
        boxShadow: '0 4px 16px rgba(37,211,102,0.40)',
        transition: 'padding 0.25s ease, box-shadow 0.25s ease',
        overflow: 'hidden',
        maxWidth: showLabel ? '260px' : '52px',
      }}
    >
      {/* WhatsApp SVG icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width="26"
        height="26"
        fill="currentColor"
        style={{ flexShrink: 0 }}
      >
        <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.477 2.027 7.782L.054 31.02a1 1 0 0 0 1.224 1.224l7.238-1.973A15.94 15.94 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.275 13.275 0 0 1-6.772-1.852l-.486-.29-5.028 1.37 1.37-5.028-.29-.486A13.275 13.275 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zM23.07 19.48c-.39-.196-2.3-1.135-2.657-1.265-.357-.13-.617-.195-.877.196-.26.39-.998 1.265-1.225 1.525-.226.26-.454.292-.844.097-.39-.196-1.648-.607-3.14-1.937-1.16-1.035-1.944-2.313-2.171-2.703-.226-.39-.024-.6.17-.795.174-.174.39-.455.585-.682.195-.228.26-.39.39-.65.13-.26.065-.487-.032-.682-.097-.196-.877-2.114-1.201-2.895-.317-.762-.638-.658-.877-.67l-.747-.013c-.26 0-.682.097-1.039.487-.357.39-1.364 1.332-1.364 3.248s1.396 3.768 1.592 4.027c.195.26 2.748 4.196 6.658 5.885.93.4 1.657.64 2.222.82.934.298 1.784.256 2.455.155.749-.113 2.3-.94 2.625-1.848.325-.91.325-1.69.227-1.848-.097-.16-.357-.26-.747-.455z" />
      </svg>

      {/* Label — slides in on hover */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          opacity: showLabel ? 1 : 0,
          maxWidth: showLabel ? '190px' : '0px',
          overflow: 'hidden',
          transition: 'opacity 0.2s ease 0.05s, max-width 0.25s ease',
          letterSpacing: '0.2px',
        }}
      >
        {tenantConfig.marketing.whatsapp.floatingLabel}
      </span>
    </a>
  )
}
