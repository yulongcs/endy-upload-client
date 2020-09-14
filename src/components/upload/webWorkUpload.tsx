import React, {
  ChangeEvent,
  useState,
} from 'react';
import { Input, Row, Col, Button, message, Progress, Table, Descriptions } from 'antd';
import axios from "axios";
import SparkMD5 from 'spark-md5'
import styles from './index.css';

// 切片大小 2MB
const CHUNK_SIZE = 1024 * 1024 * 2;

enum UploadStatus {
  INIT, //初始态
  CALCULATE, // 计算文件MD5 Hash值
  PAUSE, //暂停中
  UPLOADING, //上传中
  UPLOADED, // 上传完成
  ERROR, // 上传失败
}

// 切片
interface Part {
  size: number; // 切片的大小
  chunk: Blob; // 切片的内容
  filename?: string; // 文件名称 image.png
  chunk_name?: string; // 切片的名称 image.png-1
  percent?: number; // 切片上传的进度
}

interface Props {

}

export function WebWorkUpload(props: Props) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.INIT);
  const [currentFile, setCurrentFile] = useState<File>();
  const [partList, setPartList] = useState<Part[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [calculateProcess, setCalculateProcess] = useState<number>(0);
  const [worker, setWorker] = useState<any>(null);


  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file: File = event.target.files![0];
    setCurrentFile(file);
    setUploadStatus(UploadStatus.INIT);
  }

  const handleUpload = async () => {
    if (!currentFile) {
      return message.error('你尚未选择文件');
    }

    let partList: Part[] = createChunks(currentFile);
    partList = partList.map((part, index: number) => ({
      filename: currentFile.name,//文件名
      chunk: part.chunk,//代码块
      size: part.chunk.size,//此代码块的大小
      percent: 0
    }));

    // 计算Hash
    console.log('计算Hash开始时间:', new Date().toLocaleTimeString());
    setUploadStatus(UploadStatus.CALCULATE);
    setCalculateProcess(0);
    const fileHash = await calculateHash(partList);
    console.log('计算Hash结束时间:', new Date().toLocaleTimeString());
    let extName = currentFile.name.slice(currentFile.name.lastIndexOf('.')); //.jpg .png
    let filename = `${fileHash}${extName}`;
    partList = partList.map((part, index: number) => ({
      filename,//文件名
      chunk_name: `${filename}-${index}`,//分块的名称
      chunk: part.chunk,//代码块
      size: part.chunk.size//此代码块的大小
    }));
    setFilename(filename);
    setPartList(partList);

    // 上传文件
    setUploadStatus(UploadStatus.UPLOADING);
    await uploadParts(partList, filename);
  }

  // 计算Hash，使用web-work开通子线程计算Hash
  const calculateHash = (partList: Part[]): Promise<string> => {
    return new Promise(resolve => {
      let worker = new Worker("/hash.js");
      setWorker(worker);
      worker.postMessage({ partList });
      worker.onmessage = (event) => {
        const { percent, hash } = event.data;
        setCalculateProcess(percent);
        if (hash) {
          resolve(hash);
        }
      };
    });
  }

  async function uploadParts(partList: Part[], filename: string) {
    try {
      let requests = createRequests(partList);
      // 上传切片
      await Promise.all(requests);

      // 合并切片
      const { data = {} } = await axios({
        url: 'http://localhost:7001/merge',
        method: 'POST',
        headers: { 'Content-Type': "application/json" },
        timeout: 0,
        data: {
          filename,
          size: CHUNK_SIZE,
        }
      });

      const { success, url } = data;

      setUploadStatus(UploadStatus.UPLOADED);

      if (success) {
        setUploadStatus(UploadStatus.UPLOADED);
        setUploadedFileUrl(url)
        message.info('上传成功!');
      }
    } catch (err) {
      console.log('上传失败', err);
      message.info('上传失败!');
      setUploadStatus(UploadStatus.ERROR);
    }
  }

  // 切片上传
  function createRequests(partList: Part[]) {
    return partList.map((part: Part) => {
      const formData = new FormData();
      formData.append("file", part.chunk);
      return axios({
        url: `http://localhost:7001/upload/${part.filename}/${part.chunk_name}`,
        method: 'POST',
        data: formData,
        timeout: 0,
        timeoutErrorMessage: '上传超时',
        onUploadProgress: (e: ProgressEvent) => {
          const { loaded, total } = e;
          part.percent = +(loaded / total * 100).toFixed();
          setPartList([...partList]);
        },
      });
    })
  }

  let totalPercent = partList.length > 0 ? Math.round(partList.reduce((acc, curr) => acc + curr.percent!, 0) / (partList.length * 100) * 100) : 0;

  const fileSize = `${(currentFile?.size! / 1024 / 1024).toFixed(2)} MB`

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
            loading={[UploadStatus.CALCULATE, UploadStatus.UPLOADING].includes(uploadStatus) }
          >
            上传
          </Button>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          {
            uploadStatus === UploadStatus.UPLOADED &&
            (
              <Descriptions bordered>
                <Descriptions.Item span={3} label="File Name">{currentFile?.name}</Descriptions.Item>
                <Descriptions.Item span={3} label="Hash Name:">{filename}</Descriptions.Item>
                <Descriptions.Item span={3} label="File Size:">{fileSize}</Descriptions.Item>
                <Descriptions.Item span={3} label="File Url:">{uploadedFileUrl}</Descriptions.Item>
              </Descriptions>
            )
          }
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          {
            uploadStatus === UploadStatus.CALCULATE &&
            (
              <Row>
                <Col span={4}>
                  计算文件Hash进度:
                </Col>
                <Col span={20}>
                  <Progress percent={calculateProcess} />
                </Col>
              </Row>
            )
          }
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          {
            uploadStatus === UploadStatus.UPLOADING && (
              <>
                <Row>
                  <Col span={4}>
                    上传进度:
                  </Col>
                  <Col span={20}>
                    <Progress percent={totalPercent} />
                  </Col>
                </Row>
                <Table
                  columns={[
                    {
                      title: '切片名称',
                      dataIndex: 'chunk_name',
                      key: 'chunk_name',
                      width: '20%'
                    },
                    {
                      title: '切片进度',
                      dataIndex: 'percent',
                      key: 'percent',
                      width: '80%',
                      render: (value: number) => {
                        return <Progress percent={value} />
                      }
                    },
                  ]}
                  dataSource={partList}
                  rowKey={(row: Part) => row.chunk_name!}
                  pagination={false}
                />
              </>
            )
          }
        </Col>
      </Row>
    </div>
  )
}

// 切片
function createChunks(file: File): Part[] {
  let current = 0;
  const partList: Part[] = [];
  while (current < file.size) {
    const chunk = file.slice(current, current + CHUNK_SIZE);
    partList.push({
      chunk,
      size: chunk.size,
    });
    current += CHUNK_SIZE;
  }
  return partList;
}
