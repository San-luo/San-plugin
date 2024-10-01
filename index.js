import fs from 'fs';
import * as tool from './models/tool.js';
import cfg from '../../lib/config/config.js'
import common from '../../lib/common/common.js';
//输出提示
logger.info('-------------------------')
logger.info('San-plugin加载中....')
logger.info('-------------------------')
//如需更多可复制粘贴
//info可替换为: debug mark error

async function loadDependencies(dependencyList) {
  for (const i of dependencyList) {
    try {
      await import(`${i}`);
    } catch (error) {
      logger.warn('-------San依赖缺失-----------');
      logger.warn(`请运行: pnpm install --filter=san-plugin`);
      let msg = `请运行:  pnpm install --filter=san-plugin  `
      common.relpyPrivate(cfg.masterQQ[0], msg)
      logger.warn(`----------------------------`);
      return; // 这里可以安全地使用 return 因为我们现在在一个异步函数中
    }
  }
}



let packagejson = await tool.readFromJsonFile('./plugins/San-plugin/package.json')
const dependencylist = Object.keys(packagejson.dependencies)
// for (i of dependencylist){
// try {
//   await import(`${i}`)
// } catch (error) {
//   logger.warn('-------San依赖缺失-----------');
//   logger.warn(`请运行:  pnpm install --filter=san-plugin  `)
//   let msg = `请运行:  pnpm install --filter=san-plugin  `
//   common.relpyPrivate(cfg.masterQQ[0], msg)
//   logger.warn(`----------------------------`) 
//   return
// }
// }  
loadDependencies(dependencylist)



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