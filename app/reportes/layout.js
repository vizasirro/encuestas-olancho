export default function ReportesLayout({children}){
  return <>
    <div style={{maxWidth:1220,margin:'18px auto 0',padding:'0 18px',display:'flex',gap:10,flexWrap:'wrap'}}>
      <a href="/reportes/ejecutivo" style={{display:'inline-block',padding:'12px 18px',borderRadius:10,background:'#17634e',color:'#fff',fontWeight:800,textDecoration:'none'}}>REPORTE EJECUTIVO</a>
      <a href="/reportes" style={{display:'inline-block',padding:'12px 18px',borderRadius:10,border:'2px solid #17634e',color:'#17634e',fontWeight:800,textDecoration:'none',background:'#fff'}}>REPORTE DETALLADO</a>
    </div>
    {children}
  </>
}
