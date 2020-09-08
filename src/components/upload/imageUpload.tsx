import React, {
  ChangeEvent,
  useState,
  useEffect,
} from 'react';
import { Input, Row, Col, Button, message } from 'antd';
import { request, getCookie } from "../../utils";


enum UploadStatus {
  INIT,//初始态
  PAUSE,//暂停中
  UPLOADING//上传中
}
interface Props {

}

export function ImageUpload (props: Props) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.INIT);
  const [currentFile, setCurrentFile] = useState<File>();
  const [objectUrl, setObjectUrl] = useState('');

  useEffect(() => {
    if (currentFile) {
      const URL = window.URL;
      let objectUrl = URL.createObjectURL(currentFile);
      setObjectUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }, [currentFile]);

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

    if (!beforeUpload(currentFile)) {
      return;
    }

    setUploadStatus(UploadStatus.UPLOADING);

    const formData = new FormData();
    formData.append("file", currentFile);
    // 上传文件如果走本地代理proxy，只能上传1Mb以内的，超过回报错
    request({
      url: '/upload',
      method: 'POST',
      data: formData,
      onUploadProgress: (e: ProgressEvent) => {
        console.log('upload-progress', e);
      },
    }).then((res) => {
      console.log('上传结果', res);
      message.info('上传成功!');
      reset();
    }).catch(e => {
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
      <Row>
        <Col span={12}>
          {objectUrl && <img style={{ maxWidth: 300, maxHeight: 300, margin: 20 }} src={objectUrl} />}
        </Col>
      </Row>
    </div>
  )
}

function beforeUpload(file: File) {
  const isValidFileType = ['image/jpeg', 'image/png'].includes(file.type);
  if (!isValidFileType) {
    message.error('不支持此文件类型!');
  }
  const isLt2Mb = file.size < 1024 * 1024 * 2;
  if (!isLt2Mb) {
    message.error('上传的文件不能大于2MB!');
  }
  return isValidFileType && isLt2Mb;
}
