import fs from 'fs';
//输出提示
logger.info('-------------------------')
logger.info('San-plugin加载中....')
logger.info('-------------------------')
//如需更多可复制粘贴
//info可替换为: debug mark error

try {
  await import('js-yaml')
} catch (error) {
  logger.warn('-------San依赖缺失-----------');
  logger.warn(`请运行：${logger.red('pnpm add js-yaml -w')}`)
  logger.warn(`----------------------------`)
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