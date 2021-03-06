import React, {
  ChangeEvent,
  useState,
} from 'react';
import { Input, Row, Col, Button, message, Progress, Table, Descriptions } from 'antd';
import axios from "axios";
import SparkMD5 from 'spark-md5';

// 切片大小 2MB
const CHUNK_SIZE = 1024 * 1024 * 2;
// 上传最大并发数 4
const CONCURRENT_MIX = 4;

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
  loaded?: number; // 以及上传的大小
}

// 切片上传
interface Uploaded {
  filename: string,
  size: number;
}

interface Props {

}

export function VerifyUpload(props: Props) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.INIT);
  const [currentFile, setCurrentFile] = useState<File>();
  const [partList, setPartList] = useState<Part[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [calculateProcess, setCalculateProcess] = useState<number>(0);
  const [uploadProcess, setUploadProcess] = useState<number>(0);
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

    // 计算Hash
    console.log('抽样计算Hash开始时间:', new Date().toLocaleTimeString());
    setUploadStatus(UploadStatus.CALCULATE);
    setCalculateProcess(0);
    const fileHash = await calculateHash(partList);
    console.log('抽样计算Hash结束时间:', new Date().toLocaleTimeString());
    let extName = currentFile.name.slice(currentFile.name.lastIndexOf('.')); //.jpg .png
    let filename = `${fileHash}${extName}`;
    partList = partList.map((part, index: number) => ({
      ...part,
      filename, // hash文件名
      chunk_name: `${filename}-${index}`, //分块的名称
      percent: 0,
      loaded: 0,
    }));
    setFilename(filename);
    setPartList(partList);

    // 校验文件是否需要上传
    const { data } = await verify(filename) as any;
    const { needUpload, uploadedList, url } = data;
    if (!needUpload) {
      message.success("秒传成功");
      setUploadedFileUrl(url);
      setCalculateProcess(100);
      setUploadStatus(UploadStatus.UPLOADED);
      return;
    }

    // 上传文件
    setUploadStatus(UploadStatus.UPLOADING);
    // 过滤掉以及上传完毕的切片
    let updatedChuckCount = 0;
    let total = partList.length;
    partList = partList.filter((part: Part) => {
      let uploadedFile = uploadedList.find((item: Uploaded) => item.filename === part.chunk_name);
      if(!uploadedFile) {
        part.loaded = 0;
        part.percent = 0;
        return true;
      }
      if(uploadedFile.size < part.size) {
        part.loaded = uploadedFile.size;
        part.percent = Number(((part.loaded! / part.size) * 100).toFixed(2));
        return true;
      }
      updatedChuckCount++;
      return false
    })
    // 设置已经上传的切片占总进度的比例
    setUploadProcess(+((100 * updatedChuckCount) / partList.length).toFixed(2));
    await uploadParts(partList, CONCURRENT_MIX, updatedChuckCount);

    // 切片上传完毕，发送合并请求
    await merge(filename, CHUNK_SIZE);
  }

  // 计算Hash，使用抽样计算Hash
  // 1. 文件切片
  // 2. 第一个和最后一个切片全部内容，其他切片的取 首中尾三个地方各2个字节
  // 3. 合并后的内容，计算md5，称之为影分身Hash
  // 4. 这个hash的结果，就是文件存在，有小概率误判，但是如果不存在，是100%准的的 ，和布隆过滤器的思路有些相似
  const calculateHash = (partList: Part[]): Promise<string> => {
    return new Promise(resolve => {
      const spark = new SparkMD5.ArrayBuffer();
      let percent = 0; // 计算Hash总进度
      let count = 0;

      // 计算切片Hash值
      const appendToSpark = async (file: Blob) => {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.readAsArrayBuffer(file);
          reader.onload = e => {
            // 增量计算md5
            spark.append(e?.target?.result as ArrayBuffer);
            resolve();
          };
        });
      };

      const workLoop = async (deadline: any) => {
        // 有任务，并且当前帧还没结束
        while (count < partList.length && deadline.timeRemaining() > 1) {
          // 首位切片全量计算
          if (count === 0 || count === partList.length - 1) {
            await appendToSpark(partList[count].chunk);
          } else {
            // 中间切片抽样切片
            const chunk = [];
            const midIndex = partList[count].chunk.size / 2;
            chunk.push(partList[count].chunk.slice(0, 2));
            chunk.push(partList[count].chunk.slice(midIndex, midIndex + 2));
            chunk.push(partList[count].chunk.slice(partList[count].chunk.size - 2, 2));
            await appendToSpark(new Blob(chunk));
          }

          count++;
          // 没有了 计算完毕
          if (count < partList.length) {
            // 计算中
            percent = (100 * count) / partList.length; // 每计算一个切片，进度累加
            // 设置文件计算Hash总进度
            setCalculateProcess(+percent.toFixed(2));
          } else {
            // 计算完毕
            setCalculateProcess(100);
            resolve(spark.end());
          }
        }


        if (count < partList.length) {
          window.requestIdleCallback(workLoop);
        }
      };
      // 将在浏览器的空闲时段内对要调用的函数进行排队，空闲时间去执行切片Hash值计算
      window.requestIdleCallback(workLoop);
    });
  }

  /**
   * 控制并发删除文件
   * @param partList 切片列表
   * @param filename 文件Hash名称
   * @param max 最大并发数
   */
  async function uploadParts(partList: Part[], max: number, updatedChuckCount: number) {
    try {
      return new Promise(resolve => {
        let percent = 0; // 上传总进度
        let count = 0; // 当前上传数

        const workLoop = async (deadline: any) => {
          while (count < partList.length && deadline.timeRemaining() > 1) {
            // 创建上传请求，截取未上传的部分
            let requests = createRequests(partList.slice(count, count + max));
            // 上传切片
            await Promise.all(requests);
            count += max;

            if (count < partList.length) {
              // 切片上传中
              percent = ((count + updatedChuckCount) * 100) / (partList.length + updatedChuckCount); // 每计算一个切片，进度累加
              // 设置文件上传总进度
              setUploadProcess(+percent.toFixed(2));
            } else {
              // 切片上传完毕
              setCalculateProcess(100);
              resolve();
            }
          }

          if (count < partList.length) {
            window.requestIdleCallback(workLoop);
          }
        }

        window.requestIdleCallback(workLoop);
      });
    } catch (err) {
      console.log('上传失败', err);
      message.info('上传失败!');
      setUploadStatus(UploadStatus.ERROR);
    }
  }

  /**
   * 校验文件，文件切片上传情况
   * @param filename 文件Hash名
   */
  async function verify(filename: string) {
    return await axios({
      url: `api/verify/${filename}`,
      method: 'GET',
    });
  }

  /**
   * 
   * @param filename 文件名称
   * @param chuckSize 固定切片大小
   */
  async function merge(filename: string, chuckSize: number) {
    // 合并切片
    const { data = {} } = await axios({
      url: 'http://localhost:7001/merge',
      method: 'POST',
      headers: { 'Content-Type': "application/json" },
      timeout: 0,
      data: {
        filename,
        size: chuckSize,
      }
    });

    const { success, url } = data;

    setUploadStatus(UploadStatus.UPLOADED);

    if (success) {
      setUploadStatus(UploadStatus.UPLOADED);
      setUploadedFileUrl(url)
      message.info('上传成功!');
    }
  }

  // 切片上传
  function createRequests(partList: Part[]) {
    return partList.map((part: Part) => {
      const formData = new FormData();
      // 截取未上传的部分
      formData.append("file", part.chunk.slice(part.loaded));
      return axios({
        url: `http://localhost:7001/upload/${part.filename}/${part.chunk_name}/${part.loaded}`,
        method: 'POST',
        data: formData,
        onUploadProgress: (e: ProgressEvent) => {
          const { loaded, total } = e;
          part.percent = +(loaded / total * 100).toFixed();
          setPartList([...partList]);
        },
      });
    })
  }

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
            loading={[UploadStatus.CALCULATE, UploadStatus.UPLOADING].includes(uploadStatus)}
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
            [UploadStatus.CALCULATE, UploadStatus.UPLOADING].includes(uploadStatus) &&
            (
              <>
                <Row>
                  <Col span={4}>
                    <Button
                      style={{ marginLeft: 10 }}
                      type="primary"
                      onClick={() => sleep(10)}
                    >
                      阻塞主线程 10 秒钟
                     </Button>
                  </Col>
                </Row>
                <Row>
                  <Col span={4}>
                    计算文件Hash进度:
                </Col>
                  <Col span={20}>
                    <Progress percent={calculateProcess} />
                  </Col>
                </Row>
              </>
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
                    <Progress percent={uploadProcess} />
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

// 阻塞主线程
function sleep(second: number) {
  var start = (new Date()).getTime();
  while ((new Date()).getTime() - start < second * 1000) {
    continue;
  }
}
