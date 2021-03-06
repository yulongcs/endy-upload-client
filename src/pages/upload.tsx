import React from 'react';
import { Divider, Row, Col } from 'antd';
import {
  HashUpload,
  WebWorkUpload,
  IdleUpload,
  SampleHashUpload,
  ConcurrentUpload,
  VerifyUpload,
} from '../components/upload';
import './index.css';

export default function () {
  return (
    <>
      <h1>高级上传功能</h1>

      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">高级上传 - 主进程Hash</Divider>
          <p></p>
          <HashUpload />
        </Col>
      </Row>

      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">高级上传 - web-worker 子线程计算hash</Divider>
          <WebWorkUpload />
        </Col>
      </Row>

      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">高级上传 - requestIdleCallback 浏览器空闲时间计算/上传</Divider>
          <IdleUpload />
        </Col>
      </Row>

      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">高级上传 - 抽样计算Hash</Divider>
          <SampleHashUpload />
        </Col>
      </Row>

      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">高级上传 - 请求并发控制</Divider>
          <ConcurrentUpload />
        </Col>
      </Row>

      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">高级上传 - 断点续传，秒传</Divider>
          <VerifyUpload />
        </Col>
      </Row>
    </>
  )
}
