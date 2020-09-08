export function request(options: any) {
  let _default: any = {
    baseURL: 'http://localhost:7001',
    method: 'GET',
    header: {},
    data: {}
  };
  options = { ..._default, ...options, headers: { ..._default.headers, ...(options.headers || {}) } };
  return new Promise((resolve: Function, reject: Function) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, options.baseURL + options.url, true);
    Object.entries(options.headers).forEach(([key, value]) => xhr.setRequestHeader(key, value as string));
    xhr.responseType = 'json';
    xhr.upload.onprogress = options.onUploadProgress;
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (/(2|3)\d{2}/.test('' + xhr.status)) {
          resolve(xhr.response);
        } else {
          reject(xhr.response);
        }
      }
    }
    xhr.send(options.data);
  });
}