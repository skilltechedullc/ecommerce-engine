import Link from 'next/link'
import Image from 'next/image'
import { storeConfig } from '@/lib/config'

const CERT_LABELS = [
  'ISO 22000:2018',
  'HACCP Certified',
  'FSSAI Licensed',
  'APEDA Registered',
]

const TRUST_BADGES = ['Secure Checkout', 'Encrypted Payments', 'Trusted Delivery']

const FOOTER_LINK: React.CSSProperties = {
  fontSize: '14px',
  color: '#7AA898',
  textDecoration: 'none',
  lineHeight: '1.4',
}

const SECTION_HEADING: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  color: '#FFFFFF',
  marginBottom: '24px',
  marginTop: 0,
}

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      id="contact"
      style={{
        scrollMarginTop: '104px',
        backgroundColor: '#0F3D2E',
        color: '#A8C4B8',
        padding: '72px 40px 40px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Three-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1.4fr',
            gap: '56px',
            paddingBottom: '56px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: '32px',
          }}
        >
          {/* Col 1: Brand */}
          <div>
          {/* Logo image — inverted to white for dark background */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '10px 14px',
                boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
              }}
            >
              <Image
                src={storeConfig.logoUrl}
                alt={storeConfig.brandName}
                width={220}
                height={74}
                unoptimized
                style={{
                  objectFit: 'contain',
                  height: '74px',
                  width: 'auto',
                }}
              />
            </div>
          </div>
            <p
              style={{
                fontSize: '14px',
                color: '#7AA898',
                lineHeight: '1.85',
                maxWidth: '300px',
                margin: '0 0 8px',
              }}
            >
              Clean, sulphur-free oils and natural foods crafted with strict quality checks.
              Made in Kerala and delivered for everyday home use with trusted consistency.
            </p>
            <p
              style={{
                fontSize: '12px',
                color: '#4A7A68',
                lineHeight: '1.6',
                maxWidth: '300px',
                margin: '0 0 28px',
                fontStyle: 'italic',
              }}
            >
              Retail-first online store for healthy cooking and natural living.
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '320px' }}>
              {CERT_LABELS.map((label) => (
                <span
                  key={label}
                  style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    color: '#C8A951',
                    border: '1px solid rgba(200,169,81,0.3)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '360px', marginTop: '12px' }}>
              {TRUST_BADGES.map((badge) => (
                <span
                  key={badge}
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#D8F3E6',
                    border: '1px solid rgba(122,168,152,0.35)',
                    borderRadius: '999px',
                    padding: '5px 10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2: Shop */}
          <div>
            <h4 style={SECTION_HEADING}>Shop</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Link href="/products" style={FOOTER_LINK}>All Products</Link>
              <Link href="/cart"     style={FOOTER_LINK}>Cart</Link>
              <Link href="/checkout" style={FOOTER_LINK}>Checkout</Link>
            </div>
            <a
              className="businessGateway"
              href="https://millco.in"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '14px 15px',
                borderRadius: '12px',
                border: '1px solid rgba(122,168,152,0.22)',
                background: 'rgba(255,255,255,0.018)',
                textDecoration: 'none',
                maxWidth: '320px',
              }}
              aria-label="Open Millco business website in a new tab"
            >
              <span
                className="businessGatewayEyebrow"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#6E9C8B',
                  fontWeight: 700,
                }}
              >
                Business &amp; Bulk
              </span>
              <span className="businessGatewayBody" style={{ fontSize: '12px', color: '#7AA898', lineHeight: '1.6' }}>
                Explore our manufacturing capabilities, export solutions, and wholesale pricing.
              </span>
              <span
                className="businessGatewayCta"
                style={{
                  fontSize: '13px',
                  color: '#D8F3E6',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                }}
              >
                Visit Millco Business Site -&gt;
              </span>
            </a>
          </div>

          {/* Col 3: Contact */}
          <div>
            <h4 style={SECTION_HEADING}>Contact</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#BFCFCA', margin: '0 0 6px' }}>
                  {storeConfig.brandName}
                </p>
                <p style={{ fontSize: '13px', color: '#7AA898', lineHeight: '1.7', margin: 0 }}>
                  Thennala, Malappuram
                  <br />
                  Kerala 676508, India
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <a
                  href="tel:+919048984814"
                  style={{ fontSize: '13px', color: '#7AA898', textDecoration: 'none' }}
                >
                  +91 9048984814
                </a>
                              <a
                                href="mailto:info@millco.in"
                                style={{ fontSize: '13px', color: '#7AA898', textDecoration: 'none' }}
                              >
                                info@millco.in
                              </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <p style={{ fontSize: '12px', color: '#4A7A68', margin: 0 }}>
            &copy; {year} {storeConfig.brandName}. All rights reserved.
          </p>
          <p style={{ fontSize: '12px', color: '#7AA898', margin: 0, fontWeight: 600 }}>
            Secure checkout powered for safe online orders.
          </p>
          <p
            style={{
              fontSize: '12px',
              color: '#4A7A68',
              fontStyle: 'italic',
              fontFamily: 'var(--font-playfair), Georgia, serif',
              margin: 0,
            }}
          >
            Sulphur-Free Oils | Natural Foods | Retail Store by Millco
          </p>
        </div>
      </div>
      <style jsx>{`
        .businessGateway {
          transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
        }

        .businessGatewayCta {
          transition: opacity 180ms ease, transform 180ms ease, color 180ms ease;
        }

        .businessGateway:hover,
        .businessGateway:focus-visible {
          border-color: rgba(122, 168, 152, 0.35) !important;
          background: rgba(255, 255, 255, 0.03) !important;
          transform: translateY(-1px);
        }

        .businessGateway:hover .businessGatewayCta,
        .businessGateway:focus-visible .businessGatewayCta {
          opacity: 1;
          transform: translateY(0);
          color: #f3fbf6 !important;
        }

        @media (min-width: 900px) {
          .businessGateway {
            gap: 8px !important;
          }

          .businessGatewayCta {
            opacity: 0.52;
            transform: translateY(2px);
          }
        }
      `}</style>
    </footer>
  )
}
