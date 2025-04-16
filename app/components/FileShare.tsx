'use client';

import { useState, useEffect, useCallback } from 'react';
import { Peer } from 'peerjs';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import * as Toast from '@radix-ui/react-toast';

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const FileShare = () => {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [serverStatus, setServerStatus] = useState('未连接');
  const [peerStatus, setPeerStatus] = useState('未连接');
  const [transferStatus, setTransferStatus] = useState('');
  const [currentConnection, setCurrentConnection] = useState<any>(null);

  useEffect(() => {
    // 生成6位随机ID
    const generateShortId = () => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const newPeer = new Peer(generateShortId());
    
    newPeer.on('open', (id) => {
      setPeerId(id);
      setServerStatus('已连接');
    });

    newPeer.on('connection', (conn) => {
      setPeerStatus('对方已连接');
      conn.on('data', (data: any) => {
        if (data.type === 'file') {
          const blob = new Blob([data.buffer]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      });

      conn.on('close', () => {
        setPeerStatus('未连接');
      });

      conn.on('error', (err) => {
        setPeerStatus(`连接错误: ${err.message}`);
      });
    });

    newPeer.on('disconnected', () => {
      setServerStatus('连接断开');
      setPeerStatus('未连接');
    });

    newPeer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        setPeerStatus(`连接失败: 对方ID不存在`);
      } else if (err.type === 'network') {
        setServerStatus(`服务器连接错误: ${err.message}`);
        setPeerStatus('未连接');
      } else {
        setServerStatus(`服务器错误: ${err.message}`);
        setPeerStatus('未连接');
      }
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, []);

  // 检查连接状态
  const checkConnection = useCallback(async (targetPeerId: string) => {
    if (!peer || !targetPeerId) {
      setPeerStatus('未连接');
      return;
    }

    try {
      // 如果存在之前的连接，先关闭它
      if (currentConnection) {
        currentConnection.close();
      }

      setPeerStatus('正在连接对方...');
      const conn = peer.connect(targetPeerId);
      setCurrentConnection(conn);

      conn.on('error', (err: Error) => {
        setPeerStatus(`连接错误: ${err.message}`);
      });

      // 等待连接建立
      await new Promise<void>((resolve, reject) => {
        conn.on('open', () => {
          setPeerStatus('已连接');
          resolve();
        });
        conn.on('error', reject);
        setTimeout(() => reject(new Error('连接超时')), 5000);
      });
    } catch (err) {
      setPeerStatus('连接失败');
      setCurrentConnection(null);
    }
  }, [peer, currentConnection]);

  // 使用防抖处理输入变化
  const debouncedCheckConnection = useCallback(
    debounce((targetPeerId: string) => checkConnection(targetPeerId), 500),
    [checkConnection]
  );

  // 处理输入变化
  const handleRemotePeerIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPeerId = e.target.value;
    setRemotePeerId(newPeerId);
    if (newPeerId) {
      debouncedCheckConnection(newPeerId);
    } else {
      setPeerStatus('未连接');
    }
  }, [debouncedCheckConnection]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const sendFile = async () => {
    if (!peer || !file || !remotePeerId) {
      setTransferStatus('请确保已选择文件且输入了对方ID');
      return;
    }

    if (!currentConnection || !currentConnection.open) {
      setTransferStatus('请先建立连接');
      return;
    }

    try {
      setTransferStatus('开始传输文件...');
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          try {
            currentConnection.send({
              type: 'file',
              filename: file.name,
              buffer: e.target.result
            });
            setTransferStatus('文件发送成功');
          } catch (err: unknown) {
            if (err instanceof Error) {
              setTransferStatus(`文件发送失败: ${err.message}`);
            } else {
              setTransferStatus('文件发送失败: 未知错误');
            }
          }
        }
      };

      reader.onerror = () => {
        setTransferStatus('文件读取失败');
        setProgress(0);
      };

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress((e.loaded / e.total) * 100);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransferStatus(`发送失败: ${err.message}`);
      } else {
        setTransferStatus('发送失败: 未知错误');
      }
      setProgress(0);
    }
  };

  return (
    <Toast.Provider swipeDirection="right">
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">文件共享</h2>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">你的ID: {peerId}</p>
          {peerId && (
            <CopyToClipboard text={peerId} onCopy={() => setShowToast(true)}>
              <button className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                复制
              </button>
            </CopyToClipboard>
          )}
        </div>
        <div className="mt-2 space-y-1">
          <p className={`text-sm ${serverStatus === '已连接' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            服务器状态: {serverStatus}
          </p>
          <p className={`text-sm ${peerStatus === '已连接' ? 'text-green-600 dark:text-green-400' : peerStatus === '正在连接对方...' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
            连接状态: {peerStatus}
          </p>
          {transferStatus && (
            <p className="text-sm text-blue-600 dark:text-blue-400">
              传输状态: {transferStatus}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="输入对方的ID"
          value={remotePeerId}
          onChange={handleRemotePeerIdChange}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="mb-6 p-8 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors dark:border-gray-600 dark:hover:border-blue-400"
      >
        <input
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          id="fileInput"
        />
        <label htmlFor="fileInput" className="cursor-pointer">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            {file ? file.name : '拖拽文件到这里或点击选择文件'}
          </p>
        </label>
      </div>

      {file && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <button
        onClick={sendFile}
        disabled={!file || !remotePeerId}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        发送文件
      </button>
    </div>

    <Toast.Root
      className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-4 fixed bottom-4 right-4 data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=end]:animate-swipeOut"
      open={showToast}
      onOpenChange={setShowToast}
    >
      <Toast.Title className="text-sm font-medium text-gray-900 dark:text-white">
        复制成功
      </Toast.Title>
      <Toast.Description className="text-sm text-gray-500 dark:text-gray-400">
        ID已复制到剪贴板
      </Toast.Description>
    </Toast.Root>
    <Toast.Viewport />
    </Toast.Provider>
  );
};

export default FileShare;