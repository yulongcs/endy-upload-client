// web-worker

self.importScripts('spark-md5.min.js');

self.onmessage = function (event) {
  // 接受主线程的通知
    var { partList } = event.data;
    var spark = new self.SparkMD5.ArrayBuffer();
    var percent = 0; //总体计算hash的百分比
    var count = 0;

    const loadNext = index => {
      const reader = new FileReader()
      reader.readAsArrayBuffer(partList[index].chunk)
      reader.onload = e=>{
          // 累加器 不能依赖index，
          count++
          // 增量计算md5
          spark.append(e.target.result)
          if(count===partList.length){
              // 通知主线程，计算结束
              self.postMessage({
                  progress:100,
                  hash:spark.end()
              });
              // 关闭worker
              self.close();
          }else{
              // 每个区块计算结束，通知进度即可
              percent += 100/partList.length
              self.postMessage({
                percent: percent.toFixed(2)
              })
              // 计算下一个
              loadNext(count)
          }
      }
  }
  // 启动
  loadNext(0)
}