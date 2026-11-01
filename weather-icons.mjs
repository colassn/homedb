// Codes verified against Hong Kong Observatory weather/warning legends.
export const weatherNames={50:'天晴',51:'間有陽光',52:'短暫陽光',53:'間有陽光及幾陣驟雨',54:'短暫陽光及驟雨',60:'多雲',61:'密雲',62:'微雨',63:'有雨',64:'大雨',65:'雷暴',70:'天色良好',71:'天色良好',72:'天色良好',73:'天色良好',74:'天色良好',75:'天色良好',76:'大致多雲',77:'大致天晴',80:'大風',81:'乾燥',82:'潮濕',83:'霧',84:'薄霧',85:'煙霞',90:'炎熱',91:'溫暖',92:'清涼',93:'寒冷'};
export const warningFiles={WRAINA:'raina',WRAINR:'rainr',WRAINB:'rainb',TC1:'tc1',TC3:'tc3',TC8SE:'tc8b',TC8SW:'tc8c',TC8NE:'tc8ne',TC8NW:'tc8d',TC9:'tc9',TC10:'tc10',WTS:'ts',WFNTSA:'ntfl',WL:'landslip',WCOLD:'cold',WHOT:'vhot',WMSGNL:'sms',WFROST:'frost',WFIREY:'firey',WFIRER:'firer',WTMW:'tsunami-warn'};
export function weatherSymbol(code){return weatherNames[code]?{name:weatherNames[code],src:`./weather-${Number(code)}.png`}:null;}
export function activeWarnings(data,now=Date.now()){
 return Object.values(data||{}).filter(w=>w&&typeof w==='object'&&w.actionCode!=='CANCEL'&&(!w.expireTime||!Number.isFinite(Date.parse(w.expireTime))||Date.parse(w.expireTime)>now)).map(w=>({...w,src:warningFiles[w.code]?`./warning-${warningFiles[w.code]}.gif`:null}));
}
