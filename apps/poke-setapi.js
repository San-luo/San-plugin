import * as tool from '../models/tool.js';
import fs, { appendFile } from 'fs';
import common from '../../../lib/common/common.js';
export class San_PokeApi_Set extends plugin {
    constructor() {
        super({
            //后端信息
            name: 'San-Plugin设置戳一戳api',//插件名字，可以随便写
            dsc: '戳一戳api设置',//插件介绍，可以随便写
            event: 'message',//这个直接复制即可，别乱改
            priority: -111,//执行优先级：数值越低越6
            rule: [
                {
                    reg: '^#?(散|san|San)?戳一戳api(设置|添加).*$',
                    fnc: 'SetApi',
                    permission: 'master'
                },
                {
                    reg: '^#?(散|san|San)?戳一戳api(开启|关闭|全部)?列表$',
                    fnc: 'ApiList',
                    permission: 'master'
                },
                {
                    reg: '^#?(散|san|San)?戳一戳api全部删除$',
                    fnc: 'alldel',
                    permission: 'master'
                },
                {
                    reg: '^#?(散|san|San)?戳一戳(api)?(开启|关闭)(?!.*(?:列表)).*$',
                    fnc: 'SetState',
                    permission: 'master'
                },
                {
                    reg: '^#?(散|san|San)?戳一戳(api)?全部(开启|关闭|)$',
                    fnc: 'SetAll',
                    permission: 'master'
                },
            ]
        });
    };

   async SetApi(e) {
    try {
        const reg = /^#?(散|san|San)?戳一戳api(添加|设置)([^\s]+)[\s,+：]+(.+)$/
    let msg = e.msg;
    const match = msg.match(reg)
    const name = match[3];
    const url = match[4];
    let api = {
        [name]:{
            'api': url,
            'isopen': true
        }
    }
    if(!(fs.existsSync('./plugins/San-plugin/resources/poke/api.yaml'))){
        tool.objectToYamlFile( api,'./plugins/San-plugin/resources/poke/api.yaml')
        e.reply(`戳一戳api添加成功`)
    }else{
        let obj = await tool.readyaml('./plugins/San-plugin/resources/poke/api.yaml')
        obj[name] = {
            'api': url,
            'isopen': true
        }
        tool.objectToYamlFile( obj,'./plugins/San-plugin/resources/poke/api.yaml')
        e.reply(`戳一戳api添加成功`)
    }
    }catch(error){
        await e.reply(`格式错误! 正确格式：\n#戳一戳api添加xx名称 url`)
        logger.error(error.toString())
    }

    }

    async ApiList(e) {
        let msg = e.msg
        const reg = /^#?(散|san|San)?戳一戳api(开启|关闭|全部)?列表$/
        const match = msg.match(reg)
        //logger.info(match)
        let tag = '全部'
        if(match[2] == '开启'){
            tag = '开启'
        }
        if(match[2] == '关闭'){
            tag = '关闭'
        }
        let sendmsg=[`戳一戳api${tag}列表如下:`]
        let apilist = await tool.readyaml('./plugins/San-plugin/resources/poke/api.yaml')
        if(Object.keys(apilist).length === 0){
                sendmsg.push("还没有添加戳一戳api哦!\n#戳一戳api添加xx名称 url")
            }else{
                for(let i in apilist){
                    switch(tag){
                        case '开启':
                            if(apilist[i].isopen == true){sendmsg.push(makeapilist(i,apilist[i].api,apilist[i].isopen))};
                            break;
                        case '关闭':
                            if(apilist[i].isopen == false){sendmsg.push(makeapilist(i,apilist[i].api,apilist[i].isopen))};
                            break
                        case '全部':
                            sendmsg.push(makeapilist(i,apilist[i].api,apilist[i].isopen));
                            break
                        default:
                            break;
                    }
                }
            }

        sendmsg = await common.makeForwardMsg(e,sendmsg,`戳一戳api${tag}列表`)
        e.reply(sendmsg)
    }

    async SetState(e) {
        let msg = e.msg
        const reg = /^#?(散|san|San)?戳一戳api(?:api)?(开启|关闭)(.*)$/
        const match = msg.match(reg)
        logger.info(match)
        let state = match[2]
        if (match[3] == ``) {
            await e.reply(`api名为空!`)
            return
        }
        let name = match[3]
        let apilist = await tool.readyaml('./plugins/San-plugin/resources/poke/api.yaml')
        if(Object.keys(apilist).includes(name) == false){
            await e.reply(`戳一戳api -${name}- 不存在!`)
            return
        }
        apilist[name].isopen = state == '开启' ? true : false
        tool.objectToYamlFile(apilist,'./plugins/San-plugin/resources/poke/api.yaml')
        await e.reply(`戳一戳api -${name}- 已${state}`)
        }
  
        async SetAll(e) {
            let msg = e.msg
            const reg = /^#?(散|san|San)?戳一戳api全部(开启|关闭)$/
            const match = msg.match(reg)
            let state = match[2]
            let apilist = await tool.readyaml('./plugins/San-plugin/resources/poke/api.yaml')
            for(let i in apilist){
                switch(state){
                    case '开启':
                        apilist[i].isopen = true;
                        break;
                    case '关闭':
                        apilist[i].isopen = false;
                        break
                    default:
                        break;
                }
            }
            tool.objectToYamlFile(apilist,'./plugins/San-plugin/resources/poke/api.yaml')
            e.reply(`戳一戳api已全部${state}`)
        }
        
        async alldel(e){
            let apilist = await tool.readyaml('./plugins/San-plugin/resources/poke/api.yaml')
            for(let i in apilist){
                delete apilist[i]
            }
            tool.objectToYamlFile(apilist,'./plugins/San-plugin/resources/poke/api.yaml')
            e.reply(`戳一戳api已全部删除`)
        }
   
}
  function makeapilist(name,url,isopen) {
    switch(isopen){
        case true:
            isopen = '开启';
            break;
        case false:
            isopen = '关闭';
            break;
        default:
            break;
    }
    const indentedString = `
- ${name}: 
    api: ${url}
    状态: ${isopen}
`
    return indentedString
    }