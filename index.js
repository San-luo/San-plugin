import fs from 'fs';
import * as tool from './models/tool.js';
import cfg from '../../lib/config/config.js'
import common from '../../lib/common/common.js';
import path from 'path'
//输出提示
logger.info('-------------------------')
logger.info('San-plugin加载中....')
logger.info('-------------------------')
//如需更多可复制粘贴
//info可替换为: debug mark error
  async function checkDependencies() {
    let packagejson = await tool.readFromJsonFile('./plugins/San-plugin/package.json')
    const dependencyList = Object.keys(packagejson.dependencies) 
    for (let i of dependencyList) {
      try {
        await import(`${i}`);
      } catch (error) {
        logger.warn('-------San插件依赖缺失-----------');
        logger.warn(`请运行: pnpm install --filter=san-plugin`);
  
        let msg = `San插件依赖缺失,请运行: pnpm install --filter=san-plugin`;
        common.relpyPrivate(cfg.masterQQ[0], msg);
        logger.warn(`----------------------------`);
        
      }
    }
  }
  
  // 调用函数
  checkDependencies();

  const df_Cfg =  new Set(fs.readdirSync('./plugins/San-plugin/config/default_config').filter(file => file.endsWith('.yaml')));
  const Cfg =  new Set(fs.readdirSync('./plugins/San-plugin/config').filter(file => file.endsWith('.yaml')))
  const unload =  [...df_Cfg].filter(x => !Cfg.has(x));//获取未载入的Cfg文件
  //logger.error(unload)

  if (unload.length !== 0) {
    for (let i of unload) {
      const src = path.resolve(`./plugins/San-plugin/config/default_config/${i}`);
      const dest = path.resolve(`./plugins/San-plugin/config/${i}`);
  
      // 使用 fs.copyFile 的回调形式
      fs.copyFile(src, dest, (err) => {
        if (err) {
          logger.error('San-plugin: 配置文件复制过程中发生错误:', err);
        } else {
          logger.info(`San-plugin: 成功复制配置文件: ${i}`);
        }
      });
    }
  }

  // 对比已载入的配置文件并更新缺失的键
for (let file of Cfg) {
  const defaultConfigPath = path.resolve(`./plugins/San-plugin/config/default_config/${file}`);
  const currentConfigPath = path.resolve(`./plugins/San-plugin/config/${file}`);

  // 读取默认配置文件和当前配置文件内容
  const defaultConfig = await tool.readyaml(defaultConfigPath)
  let currentConfig;
  try {
      currentConfig = await tool.readyaml(currentConfigPath)
  } catch (error) {
      // 如果文件不存在或格式错误，默认创建一个空对象
      currentConfig = {};
  }

  // 合并默认配置中的键到当前配置中（如果当前配置中没有）
  Object.keys(defaultConfig).forEach(key => {
      if (!(key in currentConfig)) {
          currentConfig[key] = defaultConfig[key];
          logger.info(`San-plugin: 更新配置文件 ${file} `);
      }
  });
  // 保存更新后的配置文件
  tool.objectToYamlFile(currentConfig,currentConfigPath)
}


//加载插件
const files = fs.readdirSync('./plugins/San-plugin/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})
ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
      logger.error(`载入插件错误：${logger.red(name)}`)
      logger.error(ret[i].reason)
      continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}


export { apps }