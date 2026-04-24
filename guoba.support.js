import path from 'path'
import lodash from 'lodash'
import * as tool from './models/tool.js';
import fs from 'fs';

// 支持锅巴
export function supportGuoba () {
  return {
    // 插件信息，将会显示在前端页面
    // 如果你的插件没有在插件库里，那么需要填上补充信息
    // 如果存在的话，那么填不填就无所谓了，填了就以你的信息为准
    pluginInfo: {
      // name 为插件唯一标识，尽量不要与其他插件重复
      name: 'San-plugin',
      // title 为显示名称
      title: 'San-Plugin',
      // 插件描述
      description: '业余写的小插件,覆盖云崽原有添加功能',
      // 作者可以为字符串也可以为数组，当有多个作者时建议使用数组
      author: [
        '@san-luo'
      ],
      // 作者主页地址。若author为数组，则authorLink也需要为数组，且需要与author一一对应
      authorLink: [
        'https://gitee.com/San-luo'
      ],
      // 仓库地址
      link: 'https://gitee.com/San-luo/San-plugin',
      isV3: true,
      isV2: false,
      // 是否显示在左侧菜单，可选值：auto、true、false
      // 当为 auto 时，如果配置项大于等于 3 个，则显示在左侧菜单
      showInMenu: 'auto',
      // 显示图标，此为个性化配置
      // 图标可在 https://icon-sets.iconify.design 这里进行搜索
      //icon: 'mdi:stove',
      // 图标颜色，例：#FF0000 或 rgb(255, 0, 0)
      //iconColor: '#d19f56',
      // 如果想要显示成图片，也可以填写图标路径（绝对路径）
      iconPath: `${path.resolve("./plugins/San-plugin/resources/img/icon.png")}`
    },
    // 配置项信息
    configInfo: {
      // 配置项 schemas
      schemas: [
        {
            label: '功能配置',
            // 第一个分组标记开始，无需标记结束
            component: 'SOFT_GROUP_BEGIN'
        },
        {
            field: 'config.imgQuality',
            label: '图像质量',
            helpMessage: '帮助图,天气图等',
            bottomHelpMessage: '可选范围为1~100,建议80+,较低会出现马赛克',
            // 【组件类型】，可参考
            // https://doc.vvbin.cn/components/introduction.html
            // https://3x.antdv.com/components/overview-cn/
            component: 'Input',
            required: true,
            componentProps: {
                placeholder: '请输入图像质量值'
            }
        },
        {
            field: 'config.daily_api_source',
            label: '日报API切换',
            helpMessage: '内置接口切换，仅支持 CDN / 腾讯云',
            bottomHelpMessage: '选择后 #日报 和日报定时都会使用该接口',
            component: 'Select',
            required: true,
            componentProps: {
                options: [
                    { label: 'CDN', value: 'cdn' },
                    { label: '腾讯云', value: 'tencent' }
                ],
                placeholder: '请选择日报接口'
            }
        },
        {
            field: 'daily.time',
            label: '日报定时推送时间',
            helpMessage: '每天定时推送日报的时间',
            bottomHelpMessage: '格式：HH:MM，例如 07:00 表示每天早上7点推送',
            component: 'Input',
            required: false,
            componentProps: {
                placeholder: '例如：07:00'
            }
        },
        {
            field: 'daily.whitelist',
            label: '日报白名单群',
            helpMessage: '接收日报推送的群号列表',
            bottomHelpMessage: '多个群号用英文逗号分隔，例如：123456789,987654321',
            component: 'InputTextArea',
            required: false,
            componentProps: {
                placeholder: '请输入群号，多个用逗号分隔',
                rows: 3
            }
        },
        {
            field: 'config.add_face',
            label: '表情添加',
            bottomHelpMessage: '`#添加.....`功能',
            component: 'Switch'
        },
        {
            field: 'config.add_onlyMaster',
            label: '表情添加仅主人',
            bottomHelpMessage: '`#添加.....`功能仅能主人可用',
            component: 'Switch'
        },
        {
            field: 'config.face_groupApart',
            label: '表情群组分离',
            bottomHelpMessage: '是否隔离每个群组添加的表情',
            component: 'Switch'
        },
        {
            field: 'config.poke',
            label: '群聊戳一戳',
            bottomHelpMessage: '戳一戳功能,随机图',
            component: 'Switch'
        },
        {
            field: 'config.poke_onlyBot',
            label: '戳一戳仅Bot',
            bottomHelpMessage: '若关闭,则所有人被戳都会触发随机图(嫌吵勿关闭)',
            component: 'Switch'
        },
        {
            label: '优先级配置',
            // 第二个分组标记开始
            component: 'SOFT_GROUP_BEGIN'
        },
        {
            field: 'priority.weather',
            label: '天气信息',
            bottomHelpMessage: '`xx天气`,优先级越小越优先,可为负值,重启后生效',
            component: 'Input',
            required: true,
            componentProps: {
                placeholder: '请输入优先级'
            }
        },
        {
            field: 'priority.removeBackground',
            label: '去背景',
            bottomHelpMessage: '`#去背景`,优先级越小越优先,可为负值,重启后生效',
            component: 'Input',
            required: true,
            componentProps: {
                placeholder: '请输入优先级'
            }
        },
        {
            field: 'priority.LeaveMessages',
            label: '留言',
            bottomHelpMessage: '`#留言`,优先级越小越优先,可为负值,重启后生效',
            component: 'Input',
            required: true,
            componentProps: {
                placeholder: '请输入优先级'
            }
        },
        {
            field: 'priority.GroupPoke',
            label: '群聊戳一戳',
            bottomHelpMessage: '`戳一戳`,优先级越小越优先,可为负值,重启后生效',
            component: 'Input',
            required: true,
            componentProps: {
                placeholder: '请输入优先级'
            }
        },
        {
            field: 'priority.get_e',
            label: '取e实例',
            bottomHelpMessage: '`取`,优先级越小越优先,可为负值,重启后生效',
            component: 'Input',
            required: true,
            componentProps: {
                placeholder: '请输入优先级'
            }
        },
        {
            label: '戳一戳配置',
            // 第三个分组标记开始
            component: 'SOFT_GROUP_BEGIN'
        },
        {
            field: "poke.List",
            label: "戳一戳列表",
            bottomHelpMessage: "戳一戳列表",
            component: "GSubForm",
            componentProps: {
              multiple: true,
              schemas: [
                {
                    field: 'name',
                    label: 'api名称',
                    bottomHelpMessage: '请自定义该api名称',
                    component: 'Input',
                    required: true,
                    componentProps: {
                        placeholder: '请自定义该api名称'
                    }
                },
                {
                    field: 'api',
                    label: 'api的url',
                    bottomHelpMessage: '请确保api可用,任意图片api均可',
                    component: 'Input',
                    required: true,
                    componentProps: {
                        placeholder: '请输入该api的url'
                    }
                },
                {
                    field: 'isopen',
                    label: '是否开启',
                    bottomHelpMessage: '注意当多个开启时会随机选择已开启的api',
                    component: 'Switch'
                },
              ]
            }
          }
      ],
      // 获取配置数据方法（用于前端填充显示数据）
      async getConfigData () {
        let data = {
            config: await tool.readyaml('./plugins/San-plugin/config/config.yaml') ,
            priority: await tool.readyaml('./plugins/San-plugin/config/priority.yaml') ,
            poke: {
                List: []
            },
            daily: {
                time: '7:00',
                whitelist: ''
            }
        }

        // 仅允许切换内置日报 API
        if (!['cdn', 'tencent'].includes(data.config.daily_api_source)) {
            data.config.daily_api_source = 'cdn'
        }

        // 读取日报定时配置
        try {
            const dailyCronPath = './plugins/San-plugin/data/daily_cron.json'
            if (fs.existsSync(dailyCronPath)) {
                const cronData = await tool.readFromJsonFile(dailyCronPath)
                data.daily.time = cronData.time || '7:00'
            }
        } catch (e) {
            logger.error('[锅巴] 读取日报定时配置失败:', e)
        }

        // 读取日报白名单
        try {
            const whitelistPath = './plugins/San-plugin/data/daily_whitelist.json'
            if (fs.existsSync(whitelistPath)) {
                const whitelistData = await tool.readFromJsonFile(whitelistPath)
                if (whitelistData.groups && Array.isArray(whitelistData.groups)) {
                    data.daily.whitelist = whitelistData.groups.join(',')
                }
            }
        } catch (e) {
            logger.error('[锅巴] 读取日报白名单失败:', e)
        }

        let pokeapi = await tool.readyaml('./plugins/San-plugin/resources/poke/api.yaml')
        //logger.info(pokeapi)
        let list = data.poke.List
        for(let key in pokeapi){
            list.push({
                name: key,
                api: pokeapi[key].api,
                isopen: pokeapi[key].isopen
            })
        }
        //logger.info(data)
        return data
      },
      // 设置配置的方法（前端点确定后调用的方法）
      async setConfigData (data, { Result }) {
        //logger.info(data)
        // 将 newData 转换为嵌套对象
        let NewData = {};

        for(let key in data){
            if (key === 'config.imgQuality' || key.startsWith('priority.')) {
                data[key] = Number(data[key]); // 尝试转换为数字
              }
            lodash.set(NewData, key, data[key])
        }
        //logger.info(JSON.stringify(NewData,null,2))//直接打印会简化显示嵌套对象如[Object]
        let pokeList = NewData.poke.List
        let pokeData = {}
        for (let i of pokeList){
            let name = i[`name`]
            delete i[`name`]
            pokeData[name] = i
        }
        //logger.info(JSON.stringify(pokeData,null,2))
        try {
            tool.objectToYamlFile(NewData.config,'./plugins/San-plugin/config/config.yaml')
            tool.objectToYamlFile(NewData.priority,'./plugins/San-plugin/config/priority.yaml')
            tool.objectToYamlFile(pokeData,'./plugins/San-plugin/resources/poke/api.yaml')

            // 保存日报定时配置
            if (NewData.daily && NewData.daily.time) {
                const dailyCronPath = './plugins/San-plugin/data/daily_cron.json'
                const dir = path.dirname(dailyCronPath)
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true })
                }
                fs.writeFileSync(dailyCronPath, JSON.stringify({ time: NewData.daily.time }, null, 2))
            }

            // 保存日报白名单
            if (NewData.daily && NewData.daily.whitelist !== undefined) {
                const whitelistPath = './plugins/San-plugin/data/daily_whitelist.json'
                const dir = path.dirname(whitelistPath)
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true })
                }
                // 将逗号分隔的字符串转换为数组
                let groups = []
                if (NewData.daily.whitelist && NewData.daily.whitelist.trim()) {
                    groups = NewData.daily.whitelist.split(',')
                        .map(g => g.trim())
                        .filter(g => g)
                        .map(g => Number(g))
                        .filter(g => !isNaN(g))
                }
                fs.writeFileSync(whitelistPath, JSON.stringify({ groups }, null, 2))
            }

            return Result.ok({}, '保存成功~')
        } catch (error) {
            logger.error(error)
            return Result.ok({}, '出现错误,请查看控制台日志~')
        }

      }
    }
  }
}
