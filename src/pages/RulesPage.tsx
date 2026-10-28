import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, ChevronRight, Search, ShieldCheck } from 'lucide-react'
import one from '../../gamemode/1v1单挑抢n.md?raw'
import unique from '../../gamemode/1v1绝活挑战赛.md?raw'
import blood from '../../gamemode/多人混战滴血赛.md?raw'
import points from '../../gamemode/多人混战积分赛.md?raw'
import multi from '../../gamemode/多人混战抢n.md?raw'
import time from '../../gamemode/计时挑战赛.md?raw'
import relay from '../../gamemode/kvk接力抢n.md?raw'
import tblood from '../../gamemode/kvk组队滴血赛.md?raw'
import tpoints from '../../gamemode/kvk组队积分赛.md?raw'
import ttime from '../../gamemode/kvk组队计时赛.md?raw'
import grab from '../../gamemode/kvk组队抢n.md?raw'
import fight from '../../gamemode/internal/鏖战.md?raw'
import peakFight from '../../gamemode/internal/巅峰鏖战.md?raw'
import speed from '../../gamemode/internal/全速对决.md?raw'
import carLimit from '../../gamemode/internal/赛车限制.md?raw'
import bp from '../../gamemode/internal/赛道BP.md?raw'

const docs=[['1v1单挑抢n',one,'常规'],['1v1绝活挑战赛',unique,'常规'],['多人混战滴血赛',blood,'混战'],['多人混战积分赛',points,'混战'],['多人混战抢n',multi,'混战'],['计时挑战赛',time,'常规'],['kvk接力抢n',relay,'组队'],['kvk组队滴血赛',tblood,'组队'],['kvk组队积分赛',tpoints,'组队'],['kvk组队计时赛',ttime,'组队'],['kvk组队抢n',grab,'组队'],['鏖战',fight,'特殊'],['巅峰鏖战',peakFight,'特殊'],['全速对决',speed,'特殊'],['赛车限制',carLimit,'特殊'],['赛道BP',bp,'特殊']] as const

function toReadableRules(source:string){
  const lines=source.replace(/^---[\s\S]*?---/,'').split('\n')
  const output:string[]=[]
  for(let i=0;i<lines.length;i++){
    if(lines[i].trim().startsWith('|') && lines[i+1]?.includes('---')){
      i+=2
      for(;i<lines.length && lines[i].trim().startsWith('|');i++){
        const cells=lines[i].split('|').slice(1,-1).map(x=>x.trim())
        if(cells.length>=2 && cells[0] && !/^:?-+/.test(cells[0])) output.push(`- **${cells[0]}**：${cells.slice(1).join('；')}`)
      }
      i--
    }else output.push(lines[i])
  }
  return output.join('\n')
}

export function RulesPage(){const [active,setActive]=useState(0);const [query,setQuery]=useState('');const shown=docs.map((x,i)=>({...x,index:i})).filter(x=>x[0].toLowerCase().includes(query.toLowerCase()));return <div className="rules-page page-enter"><div className="page-title"><div><span className="eyebrow">GAME MODE MANUAL</span><h1>玩法规则</h1><p>规则已整理为便于阅读的文字说明</p></div></div><div className="rules-layout panel"><aside className="rules-nav"><label className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索玩法"/></label>{['常规','混战','组队','特殊'].map(group=><div className="rule-group" key={group}><span>{group}玩法</span>{shown.filter(x=>x[2]===group).map(item=><button key={item[0]} className={active===item.index?'active':''} onClick={()=>setActive(item.index)}><ShieldCheck size={15}/>{item[0]}<ChevronRight size={14}/></button>)}</div>)}</aside><article className="markdown-body"><div className="doc-badge"><BookOpen size={15}/>{docs[active][2]}玩法</div><ReactMarkdown remarkPlugins={[remarkGfm]}>{toReadableRules(docs[active][1])}</ReactMarkdown></article></div></div>}
