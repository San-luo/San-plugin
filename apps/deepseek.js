import * as tool from '../models/tool.js';
import OpenAI from 'openai';
import fs from 'fs';
import common from '../../../lib/common/common.js';
const apiKey = "sk-gmtnxmepzkkwcypzhzjzquqgbvghewhueyorqgdeauodjnwi" 
//api注册地址https://cloud.siliconflow.cn/i/k8KVk0zo  填邀请码让我嫖一嫖let history = {}
const historypath = "./plugins/San-plugin/resources/AI/history.json"
export class dpai extends plugin {
    constructor() {
        super({
            name: 'deepseek',
            dsc: 'deepseek-ai',
            event: 'message',
            priority: 100,
            rule: [
                {
                    reg: '^#dp(.*)$', 
                    fnc: 'deepseek'
                },
                {
                    reg: '^#(对话结束|结束对话|结束聊天|删除对话|删除对话(记录)?)$', 
                    fnc: 'DelHistory'
                }
            ]
        }); 
    }

    async deepseek(e){
        e.reply("~~~~~~~~~~",true,{ recallMsg: 4 })
        let history = await tool.readFromJsonFile(historypath, true)
        let msg = e.msg
        let reg = /^#dp(.*)/;
        let match = msg.match(reg)
        let text = match[1]
        if(!(history?.[e.user_id])){
        history[e.user_id] = [{"role": "user", "content": text}]
        }else{
        history[e.user_id].push({"role": "user", "content": text})
        }

        let fullResponse = '';
        const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.siliconflow.cn/v1',
        });
        const completion = await openai.chat.completions.create({
            model: "deepseek-ai/DeepSeek-R1",
            messages: history[e.user_id],
            temperature: 0.6,
            top_p: 0.7,
            max_tokens: 4096,
            stream: true
        });
  
        const models = await openai.models.list();
        try{
            // 打印模型名称
            models.data.forEach(model => {
            // logger.warn(model.id);
            });
        }catch (error) {
            console.error('Error fetching models:', error);
        }
        for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            //process.stdout.write(content);
            fullResponse += content;
        }
        //logger.info(fullResponse)
        //const Reg = /(<think>)([\s\S]*?)(<\/think>)([\s\S]*)/;
        //let Match = await fullResponse.match(Reg);
        //logger.info(Match)
        //const part1 = Match[2]; // <think>和最后一个</think>之间的内容
        //const part2 = Match[4]; // 最后一个</think>之后的内容
        //const Msg = await common.makeForwardMsg(e,["-------Think-------",part1,"------Context------",part2], 'DeepSeek-R1')
        const Msg = await common.makeForwardMsg(e,[fullResponse], 'DeepSeek-R1')
        //logger.error('Full response:', fullResponse);
        e.reply(Msg)
        history[e.user_id].push({"role": "assistant", "content": fullResponse})
        tool.JsonWrite(history, historypath)
    }

    async DelHistory(e){
        if(!fs.existsSync("./plugins/San-plugin/resources/AI/history.json")){
            e.reply("还没有对话记录哦")
        }
        let history = await tool.readFromJsonFile(historypath)
        if(history?.[e.user_id]){
            delete history[e.user_id]
            e.reply("已删除本次对话",true)
            tool.JsonWrite(history,historypath)
        }else{
            e.reply("还没有对话记录哦")
        }
    }
}