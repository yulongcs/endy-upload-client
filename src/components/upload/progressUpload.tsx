import React, {
  ChangeEvent,
  useState,
  useEffect,
} from 'react';
import { Input, Row, Col, Button, message, Progress } from 'antd';
import axios from "axios";


enum UploadStatus {
  INIT, //初始态
  PAUSE, //暂停中
  UPLOADING, //上传中
  UPLOADED, // 上传完成
}
interface Props {

}

export function ProgressUpload (props: Props) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.INIT);
  const [currentFile, setCurrentFile] = useState<File>();
  const [percent, setPercent] = useState<number>(0);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file: File = event.target.files![0];
    setCurrentFile(file);
    console.log('file', file);
    reset();
  }

  function reset() {
    setUploadStatus(UploadStatus.INIT);
    setPercent(0)
  }

  const handleUpload = async () => {
    if (!currentFile) {
      return message.error('你尚未选择文件');
    }

    setUploadStatus(UploadStatus.UPLOADING);

    const formData = new FormData();
    formData.append("file", currentFile);
    // 上传文件如果走本地代理proxy，只能上传1Mb以内的，超过回报错
    axios({
      url: 'http://localhost:7001/upload',
      method: 'POST',
      data: formData,
      timeout: 0, // 0没有超时时间
      timeoutErrorMessage: '上传请求超时',
      onUploadProgress: (e: ProgressEvent) => {
        const { loaded, total } = e;
        setPercent(+(loaded /total * 100).toFixed());
        console.log('upload-onUploadProgress', {
          ProgressEvent: e,
          Progress: +(loaded/total * 100).toFixed()
        });
      },
    }).then((res) => {
      console.log('上传结果', res.data);
      message.info('上传成功!');
      setUploadStatus(UploadStatus.UPLOADED);
    }).catch(e => {
      message.error(e.message);
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
      <Row>
        <Col span={24}>
          {
            ([UploadStatus.UPLOADING, UploadStatus.UPLOADED].includes(uploadStatus)) &&
            <Progress percent={percent} />
          }
        </Col>
      </Row>
    </div>
  )
}

