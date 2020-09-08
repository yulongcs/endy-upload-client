import React from 'react';

export function FormUpload() {
  return (
    <div className="upload">
      <form
        action="http://localhost:7001/upload"
        method="post"
        encType="multipart/form-data">
        <input type="file" name="file" />
        <button type="submit">上传</button>
      </form>
    </div>
  )
}
