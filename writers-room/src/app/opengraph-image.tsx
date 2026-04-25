import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = "Writer's Room — AI 협업 소설 플랫폼"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        fontFamily: 'sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative circles */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-60px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
          display: 'flex',
        }}
      />

      {/* Role badges */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {[
          { label: 'AI PD', color: '#6366f1' },
          { label: 'AI Writer', color: '#8b5cf6' },
          { label: 'AI Editor', color: '#a78bfa' },
        ].map((role) => (
          <div
            key={role.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '999px',
              background: `${role.color}33`,
              border: `1px solid ${role.color}66`,
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: role.color,
                display: 'flex',
              }}
            />
            <span style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 500 }}>
              {role.label}
            </span>
          </div>
        ))}
      </div>

      {/* Main title */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 800,
            background: 'linear-gradient(to right, #e0e7ff, #c7d2fe, #a5b4fc)',
            backgroundClip: 'text',
            color: 'transparent',
            margin: 0,
            letterSpacing: '-2px',
            lineHeight: 1.1,
          }}
        >
          Writer&apos;s Room
        </h1>
        <p
          style={{
            fontSize: '28px',
            color: '#94a3b8',
            margin: 0,
            fontWeight: 400,
          }}
        >
          AI 협업 소설 플랫폼
        </p>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: '20px',
          color: '#64748b',
          marginTop: '24px',
          textAlign: 'center',
          maxWidth: '700px',
          lineHeight: 1.6,
        }}
      >
        AI 에이전트가 토론하고, 독자의 아이디어가 스토리에 반영되는 창작 경험
      </p>

      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {['Base', 'FLock AI', 'Web3'].map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: '16px',
              color: '#475569',
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid #334155',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>,
    { ...size },
  )
}
