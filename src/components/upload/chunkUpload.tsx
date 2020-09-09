import React, {
  ChangeEvent,
  useState,
  useEffect,
} from 'react';
import { Input, Row, Col, Button, message, Progress, Table } from 'antd';
import axios from "axios";
import styles from './index.css';

// 切片大小 1MB
const CHUNK_SIZE = 1024 * 1024 * 1;

enum UploadStatus {
  INIT, //初始态
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

export function ChunkUpload(props: Props) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.INIT);
  const [currentFile, setCurrentFile] = useState<File>();
  const [partList, setPartList] = useState<Part[]>([]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file: File = event.target.files![0];
    setCurrentFile(file);
    setUploadStatus(UploadStatus.INIT);
  }

  const handleUpload = async () => {
    if (!currentFile) {
      return message.error('你尚未选择文件');
    }

    setUploadStatus(UploadStatus.UPLOADING);

    let partList: Part[] = createChunks(currentFile);
    partList = partList.map((part, index: number) => ({
      filename: currentFile.name,//文件名
      chunk_name: `${currentFile.name}-${index}`,//分块的名称
      chunk: part.chunk,//代码块
      size: part.chunk.size,//此代码块的大小
      percent: 0
    }));

    setPartList(partList);
    await uploadParts(partList, currentFile.name);
  }

  async function uploadParts(partList: Part[], filename: string) {
    try {
      let requests = createRequests(partList);
      // 上传切片
      await Promise.all(requests);
      
      // 合并切片
      await axios({
        url: 'http://localhost:7001/merge',
        method: 'POST',
        headers: { 'Content-Type': "application/json" },
        timeout: 0,
        data: {
          filename,
          size: CHUNK_SIZE,
        }
      });

      setUploadStatus(UploadStatus.UPLOADED);
      message.info('上传成功!');
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
        onUploadProgress: (e: ProgressEvent) => {
          const { loaded, total } = e;
          part.percent = +(loaded /total * 100).toFixed();
          setPartList([...partList]);
        },
      });
    })
  }

  let totalPercent = partList.length > 0 ? Math.round(partList.reduce((acc, curr) => acc + curr.percent!, 0) / (partList.length * 100) * 100) : 0;

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
            ([UploadStatus.UPLOADING, UploadStatus.UPLOADED, UploadStatus.ERROR].includes(uploadStatus)) && (
              <>
                <Row>
                  <Col span={4}>
                    总体进度:
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
