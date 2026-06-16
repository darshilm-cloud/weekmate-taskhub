import { FileExcelOutlined, FileImageOutlined, FileOutlined, FilePdfOutlined, FilePptOutlined, FileTextOutlined, FileWordOutlined, FileZipOutlined, Html5Outlined } from "@ant-design/icons";

export const fileImageSelect = (fileType, iconSize) => {
    switch (fileType) {
        case ".pdf":
            return <FilePdfOutlined style={{ fontSize: iconSize || '70px', color: 'red' }} />;
        case ".png":
            return <FileImageOutlined style={{ fontSize: iconSize || '70px', color: ' #AC3774' }} />;
        case ".doc":
            return <FileWordOutlined style={{ fontSize: iconSize || '70px', color: '#1248AB' }} />;
        case ".ppt":
            return <FilePptOutlined style={{ fontSize: iconSize || '70px', color: ' #C24423' }} />
        case ".xlsx":
            return <FileExcelOutlined style={{ fontSize: iconSize || '40px', color: ' green' }} />
        case ".txt":
            return <FileTextOutlined style={{ fontSize: iconSize || '40px', color: ' gray' }} />
        case ".zip":
            return <FileZipOutlined style={{ fontSize: iconSize || '70px', color: ' #F7E190' }} />
        case ".html":
            return <Html5Outlined style={{ fontSize: iconSize || '70px', color: ' orange' }} />
        default:
            return <FileOutlined style={{ fontSize: iconSize || '45px', color: 'gray' }} />
    }
}