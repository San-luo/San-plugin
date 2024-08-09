import * as tool from '../models/tool.js';
const cfg_priority = await tool.set_priority("weather")
export class San_Weather extends plugin {
    constructor () {
      super({
        name: 'San_weather',
        dsc: '通过截取和风天气页面获取天气信息',
        event: 'message',//发出提示信息
        priority: cfg_priority,//优先级
        rule: [
            { 
          reg: '^#[\u4e00-\u9fa5A-Za-z]+天气$',
          fnc: 'weather_info'
                // 执行方法
            }   
    ]
      })
  
    }
    async weather_info (e){
        let str = e.msg
        // 获取 # 之后的第一个位置
        let startIndex = str.indexOf("#") + 1;
        // 获取 "天气" 之前的位置
        let endIndex = str.indexOf("天气");
        // 提取子字符串
        let location = str.substring(startIndex, endIndex);
        // 获取对应的和风天气url
        let url = await tool.location_url(location)
        // 截取指定区域
        tool.screenshot(e,url,tool.clipRegion(0,110,400,771))
    }
}