import * as tool from '../models/tool.js';
const cfg_priority = await tool.set_priority("daily_paper")
export class daily extends plugin {
    constructor() {
        super({
            name: 'daily-paper',
            dsc: '日报',
            event: 'message',
            priority: cfg_priority,
            rule: [
                {
                    reg: '^#日报$', 
                    fnc: 'daily'
                }
            ]
        }); 

    }
    async daily(e){
        async function get(e) {
            try{
                const response = await fetch('http://localhost:55607/api/v1/dayNews')
                if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
                const data = await response.json()
                let base64 = data[`data`].base64
                //logger.info(base64)
                e.reply(segment.image(`base64://${base64}`))
            } catch(error) {
                logger.error(`请求异常:${error}`)
                e.reply(`日报请求异常`)
            }
        }

        await get(e)
    }
    
}