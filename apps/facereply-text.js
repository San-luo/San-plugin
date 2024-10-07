import * as face from './add-face.js';
export class San_ReplyFace2 extends plugin {
    constructor() {
        super({
            name: 'San表情随机回复-text',
            dsc: 'San表情随机回复-text',
            event: 'message', //发出提示信息
            priority: '49999', //优先级
            rule: [
                {
                    reg: '^(?=.*[^\d])[^\d]*\d*[^\d]*$',
                    fnc: 'getText',
                    log: false,
                },
            ]
        })
    }
    async getText(e) {
        face.facereply(e)
    }

}