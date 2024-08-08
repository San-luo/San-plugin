import yaml from 'js-yaml';
import fs from 'fs';

export function masterQQ(){
    // 读取YAML文件
    const fileContents = fs.readFileSync('./config/config/other.yaml', 'utf8');
    // 将YAML内容解析为JavaScript对象
    const data = yaml.load(fileContents);
    // 获取键的值
    const keyValue = data.masterQQ; 
    // 转换为字符串类型 
    const masterqq = keyValue[0].toString()
    //返回主人QQ号
    return masterqq
}