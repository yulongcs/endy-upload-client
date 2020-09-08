import React from 'react';
import { Divider, Row, Col } from 'antd';
import {
  FormUpload,
  BaseUplod,
  ImageUpload,
  ProgressUpload,
} from '../components/upload';
import './index.css';

export default function () {
  return (
    <>
      <h1>基础上传功能</h1>
      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">基本上传功能, form上传方式</Divider>
          <FormUpload />
        </Col>
      </Row>
  
      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">基本上传功能, fetch上传方式</Divider>
          <BaseUplod />
        </Col>
      </Row>

      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">图片上传功能，预览，XMLHttpRequest上传方式</Divider>
          <ImageUpload />
        </Col>
      </Row>

      <Row gutter={[0, 50]}>
        <Col span={24}>
          <Divider orientation="left">文件上传，进度条，axios上传方式</Divider>
          <ProgressUpload />
        </Col>
      </Row>
    </>
  )
}
