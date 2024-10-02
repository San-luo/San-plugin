export class quit extends plugin {
    constructor () {
      super({
        name: '监听回复',
        dsc: '自动退群',
        event: 'message.private'
      })
    }
  
    async getText (){
      let e = this.e
     e.reply("11")
    }
  }