# LINE Account Linking Guide
การผูก/เชื่อมต่อบัญชีผู้ใช้กับ LINE OA Account

---

## 📋 สารบัญ
1. [ขั้นตอนการผูกบัญชี](#ขั้นตอนการผูกบัญชี)
2. [API Endpoints](#api-endpoints)
3. [วิธีการใช้งาน](#วิธีการใช้งาน)
4. [Troubleshooting](#troubleshooting)
5. [ข้อกำหนดเบื้องต้น](#ข้อกำหนดเบื้องต้น)

---

## ขั้นตอนการผูกบัญชี

### 🔄 Flow ของการผูกบัญชี

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. ผู้ใช้เลือก "Link LINE Account" ในแอปพลิเคชัน          │
│                                                             │
│  ↓                                                           │
│                                                             │
│  2. เรียก API: POST /api/line-oa/linking/initiate           │
│     - ส่ง userId                                            │
│     - ได้รับ linkingUrl, verificationToken                  │
│                                                             │
│  ↓                                                           │
│                                                             │
│  3. ผู้ใช้สแกน QR code หรือคลิกลิงก์                        │
│     - เปิด LINE Login (ตรวจสอบตัวตน)                      │
│     - LINE อนุญาตการเชื่อมต่อ                               │
│                                                             │
│  ↓                                                           │
│                                                             │
│  4. Callback กลับมายังแอปพลิเคชัน                           │
│     - ดึง lineUserId จาก LINE response                      │
│                                                             │
│  ↓                                                           │
│                                                             │
│  5. เรียก API: POST /api/line-oa/linking/verify             │
│     - ส่ง userId, lineUserId, verificationToken             │
│     - ยืนยันการเชื่อมต่อ                                    │
│                                                             │
│  ↓                                                           │
│                                                             │
│  ✅ สำเร็จ! บัญชีเชื่อมต่อกับ LINE แล้ว                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1️⃣ เริ่มต้นการเชื่อมต่อ

**Endpoint:** `POST /api/line-oa/linking/initiate`

**Request:**
```json
{
  "userId": 1
}
```

**Success Response (200):**
```json
{
  "success": true,
  "linkingUrl": "http://localhost:3000/auth/line/callback?token=abc123...",
  "verificationToken": "abc123def456...",
  "expiresIn": 900,
  "message": "Please scan the QR code or click the link to link your LINE account"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "Invalid user ID",
  "code": 400
}
```

**Parameters:**
- `userId` (number, required): ID ของผู้ใช้ที่ต้องการเชื่อมต่อ

**Errors:**
- ❌ `Invalid user ID` - userId ไม่ถูกต้อง
- ❌ `User not found` - ผู้ใช้ไม่มีอยู่ในระบบ
- ❌ `Account already linked` - บัญชีเชื่อมต่อแล้ว (isLinked = true)

---

### 2️⃣ ยืนยันการเชื่อมต่อ

**Endpoint:** `POST /api/line-oa/linking/verify`

**Request:**
```json
{
  "userId": 1,
  "lineUserId": "U1234567890abcdef1234567890abcdef",
  "verificationToken": "abc123def456..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Account linked successfully",
  "data": {
    "userId": 1,
    "lineUserId": "U1234567890abcdef1234567890abcdef",
    "status": "VERIFIED",
    "linkedAt": "2024-12-25T10:30:00Z"
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "Verification token expired",
  "code": 400
}
```

**Parameters:**
- `userId` (number, required): ID ของผู้ใช้
- `lineUserId` (string, required): LINE User ID จาก LINE Platform
- `verificationToken` (string, required): Token จาก initiate request

**Errors:**
- ❌ `Invalid verification token` - Token ไม่ตรง
- ❌ `Verification token expired` - Token หมดอายุ (15 นาที)
- ❌ `User not found` - ผู้ใช้ไม่มีอยู่ในระบบ
- ❌ `This LINE account is already linked` - LINE ID นี้เชื่อมต่อกับบัญชีอื่นแล้ว

---

### 3️⃣ ตรวจสอบสถานะการเชื่อมต่อ

**Endpoint:** `GET /api/line-oa/linking/status?userId=1`

**Success Response:**
```json
{
  "isLinked": true,
  "data": {
    "lineUserId": "U1234567890abcdef1234567890abcdef",
    "displayName": "John Doe",
    "pictureUrl": "https://...",
    "status": "VERIFIED",
    "linkedAt": "2024-12-25T10:30:00Z"
  }
}
```

**Not Linked Response:**
```json
{
  "isLinked": false,
  "data": null
}
```

---

### 4️⃣ ยกเลิกการเชื่อมต่อ

**Endpoint:** `DELETE /api/line-oa/linking?userId=1`

**Success Response:**
```json
{
  "message": "Account unlinked successfully"
}
```

---

## วิธีการใช้งาน

### 📱 Frontend Implementation (React/Next.js)

```typescript
// hooks/useLineLink.ts
import { useState } from 'react';

export const useLineLink = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: เริ่มต้นการเชื่อมต่อ
  const initiateLinking = async (userId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/line-oa/linking/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      // สำหรับ QR code
      console.log('Linking URL:', data.linkingUrl);
      console.log('Verification Token:', data.verificationToken);
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate linking');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Step 2: ยืนยันการเชื่อมต่อ (เรียกหลังจาก callback จาก LINE)
  const verifyLinking = async (
    userId: number,
    lineUserId: string,
    verificationToken: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/line-oa/linking/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lineUserId,
          verificationToken,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify linking');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ตรวจสอบสถานะ
  const checkLinkingStatus = async (userId: number) => {
    try {
      const response = await fetch(
        `/api/line-oa/linking/status?userId=${userId}`
      );
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
      throw err;
    }
  };

  return {
    loading,
    error,
    initiateLinking,
    verifyLinking,
    checkLinkingStatus,
  };
};
```

### 🖥️ Component Usage

```tsx
// components/LineAccountLinking.tsx
'use client';

import { useState, useEffect } from 'react';
import { useLineLink } from '@/hooks/useLineLink';

export default function LineAccountLinking({ userId }: { userId: number }) {
  const { loading, error, initiateLinking, checkLinkingStatus } = useLineLink();
  const [isLinked, setIsLinked] = useState(false);
  const [linkingUrl, setLinkingUrl] = useState<string | null>(null);

  useEffect(() => {
    // ตรวจสอบสถานะการเชื่อมต่อ
    checkLinkingStatus(userId).then((data) => {
      setIsLinked(data.isLinked);
    });
  }, [userId]);

  const handleLinkClick = async () => {
    try {
      const data = await initiateLinking(userId);
      setLinkingUrl(data.linkingUrl);
      // เปิด URL ใน popup หรือ redirect
      window.open(data.linkingUrl, '_blank');
    } catch (err) {
      console.error('Failed to initiate linking:', err);
    }
  };

  return (
    <div className="line-linking">
      {isLinked ? (
        <div className="success">
          <p>✅ บัญชีของคุณเชื่อมต่อกับ LINE แล้ว</p>
        </div>
      ) : (
        <div className="pending">
          <button
            onClick={handleLinkClick}
            disabled={loading}
            className="btn-link-line"
          >
            {loading ? 'กำลังจัดเตรียม...' : 'เชื่อมต่อกับ LINE'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
```

---

## Troubleshooting

### ❌ API Error: 500

**สาเหตุ:**
- User ID ไม่ถูกต้องหรือไม่มีอยู่ในฐานข้อมูล
- Database connection issue
- Missing environment variables

**วิธีแก้:**
```bash
# ตรวจสอบ environment variables
echo $LINE_CHANNEL_SECRET
echo $LINE_ACCESS_TOKEN

# ตรวจสอบ user มีอยู่ไหม
psql -U user -d database -c "SELECT * FROM \"User\" WHERE id = 1;"
```

### ⏰ Verification Token Expired

**สาเหตุ:** Token มีอายุเพียง 15 นาที ผู้ใช้ใช้เวลานานเกินไป

**วิธีแก้:**
- ขอ token ใหม่โดยเรียก `/linking/initiate` อีกครั้ง

### 🔐 This LINE account is already linked

**สาเหตุ:** LINE User ID นี้เชื่อมต่อกับบัญชีอื่นแล้ว

**วิธีแก้:**
- ผู้ใช้ต้องยกเลิกการเชื่อมต่อก่อน (`DELETE /api/line-oa/linking`)
- หรือ ใช้ LINE account อื่น

---

## ข้อกำหนดเบื้องต้น

### Database Schema
```prisma
model LineOALink {
  id                    Int      @id @default(autoincrement())
  userId                Int      @unique
  lineUserId            String
  displayName           String?
  pictureUrl            String?
  verificationToken     String?
  verificationExpiry    DateTime?
  status                String   @default("PENDING") // PENDING, VERIFIED
  
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### Environment Variables
```env
# LINE Platform Credentials
LINE_CHANNEL_SECRET=your_channel_secret
LINE_ACCESS_TOKEN=your_access_token
LINE_LOGIN_REDIRECT_URI=http://localhost:3000/auth/line/callback

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

---

## 📞 Support

หากพบปัญหา:
1. ตรวจสอบ logs จาก backend (`console.log` ใน line-oa-linking.service.ts`)
2. ตรวจสอบ LINE Platform Console
3. ตรวจสอบ Database records ใน `lineOALink` table
