import React, {
  ChangeEvent,
  useState,
} from 'react';
import { Input, Row, Col, Button, message } from 'antd';

function checkStatus(response: Response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    var error = new Error(response.statusText)
    throw error;
  }
}

function parseJSON(response: Response) {
  return response.json()
}


enum UploadStatus {
  INIT,//初始态
  PAUSE,//暂停中
  UPLOADING//上传中
}

interface Props {

}

export function BaseUplod(props: Props) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.INIT);
  const [currentFile, setCurrentFile] = useState<File>();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file: File = event.target.files![0];
    setCurrentFile(file);
    console.log('file', file);
    reset();
  }
  function reset() {
    setUploadStatus(UploadStatus.INIT);
  }

  const handleUpload = async () => {
    if (!currentFile) {
      return message.error('你尚未选择文件');
    }

    setUploadStatus(UploadStatus.UPLOADING);

    const formData = new FormData();
    formData.append("file", currentFile);
    // 上传文件如果走本地代理proxy，只能上传1Mb以内的，超过回报错
    fetch('http://localhost:7001/upload', {
      method: 'POST',
      body: formData,
      // headers:{
      //   "Content-Type": "multipart/form-data",
      // },
    })
      .then(checkStatus)
      .then(parseJSON)
      .then((res: Response) => {
        console.log('上传结果', res);
        message.info('上传成功!');
        reset();
      }).catch((e: Error) => {
        message.error(e.message);
        reset();
      });
  }

  return (
    <div className="upload">
      <Row>
        <Col span={12}>
          <Input type="file" onChange={handleChange} />
        </Col>
        <Col flex="100px">
          <Button
            style={{ marginLeft: 10 }}
            type="primary"
            onClick={handleUpload}
            loading={uploadStatus === UploadStatus.UPLOADING}
          >
            上传
          </Button>
        </Col>
      </Row>
    </div>
  )
}
