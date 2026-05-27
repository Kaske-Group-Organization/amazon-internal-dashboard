import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../auth/msalConfig.js'

export default function Login({ denied }) {
  const { instance } = useMsal()

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f3'}}>
      <div style={{background:'#fff',border:'1px solid rgba(0,0,0,0.08)',borderRadius:16,padding:'2.5rem 2rem',maxWidth:380,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:32,marginBottom:12}}>▦</div>
        <h1 style={{fontSize:18,fontWeight:600,marginBottom:4}}>Amazon Dashboard</h1>
        <p style={{fontSize:13,color:'#888',marginBottom:24}}>Kaske Group</p>

        {denied ? (
          <>
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'12px 16px',marginBottom:20}}>
              <p style={{fontSize:13,color:'#dc2626',fontWeight:500}}>Kein Zugriff</p>
              <p style={{fontSize:12,color:'#dc2626',marginTop:4}}>Diese E-Mail-Adresse ist nicht berechtigt.</p>
            </div>
            <button
              onClick={() => instance.logoutPopup()}
              style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid rgba(0,0,0,0.12)',background:'transparent',cursor:'pointer',fontSize:13,color:'#555'}}
            >
              Mit anderem Account anmelden
            </button>
          </>
        ) : (
          <>
            <p style={{fontSize:13,color:'#555',marginBottom:24,lineHeight:1.6}}>
              Melde dich mit deinem Microsoft-Account an.
            </p>
            <button
              onClick={() => instance.loginPopup(loginRequest)}
              style={{width:'100%',padding:'12px',borderRadius:8,border:'none',background:'#2563eb',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',gap:10}}
            >
              <svg width="18" height="18" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
              Mit Microsoft anmelden
            </button>
          </>
        )}
      </div>
    </div>
  )
}
