import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TASAVIA - Aviation Technical & Commercial Services'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(45deg, #1e40af 0%, #0891b2 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              fontSize: '120px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            TASAVIA
          </div>
        </div>
        <div
          style={{
            fontSize: '32px',
            color: '#e2e8f0',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
          }}
        >
          Your partner to keep aircrafts flying
        </div>
        <div
          style={{
            fontSize: '24px',
            color: '#cbd5e1',
            textAlign: 'center',
            marginTop: '20px',
          }}
        >
          ISO9001 Certified Aviation Services
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}