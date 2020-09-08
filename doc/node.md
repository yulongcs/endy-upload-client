### 问题记录
- 1. fetch 不支持上传进度，如果需要上传进度需要使用xhr或者axios
- 2. 使用本地devserver代理方式上传文件，只能上传1mb以内的文件，
     - 线上可以修改nginx配置
     - 本地可以使用baseurl拼接方式
- 3. eggjs,  multipart, fileSize限制配置不准确