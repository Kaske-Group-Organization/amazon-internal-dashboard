import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../auth/msalConfig.js'

export default function Login({ denied }) {
  const { instance } = useMsal()

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-icon">▦</div>
        <div className="login-title">DataTrail</div>
        <div className="login-sub">Amazon Dashboard · Kaske Group</div>

        {denied ? (
          <>
            <div className="login-error">
              <div className="login-error-title">Kein Zugriff</div>
              <div className="login-error-msg">Diese E-Mail-Adresse ist nicht berechtigt.</div>
            </div>
            <button className="login-btn" onClick={() => instance.logoutPopup()}>
              Mit anderem Account anmelden
            </button>
          </>
        ) : (
          <>
            <p style={{fontSize:13,color:'var(--tx2)',marginBottom:24,lineHeight:1.6}}>
              Melde dich mit deinem Microsoft-Account an.
            </p>
            <button className="login-btn" onClick={() => instance.loginPopup(loginRequest)}>
              <svg width="18" height="18" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Mit Microsoft anmelden
            </button>
          </>
        )}
      </div>
    </div>
  )
}
