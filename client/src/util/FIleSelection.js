import { FileExcelOutlined, FileImageOutlined, FileOutlined, FilePdfOutlined, FilePptOutlined, FileTextOutlined, FileWordOutlined, FileZipOutlined, Html5Outlined } from "@ant-design/icons";

export const fileImageSelect = (fileType, iconSize) => {
    switch (fileType) {
        case ".pdf":
            return <FilePdfOutlined style={{ fontSize: iconSize || '70px', color: 'red' }} />;
            break;
        case ".png":
            return <FileImageOutlined style={{ fontSize: iconSize || '70px', color: ' #AC3774' }} />;
            break;
        case ".doc":
            return <FileWordOutlined style={{ fontSize: iconSize || '70px', color: '#1248AB' }} />;
            break;
        case ".ppt":
            return <FilePptOutlined style={{ fontSize: iconSize || '70px', color: ' #C24423' }} />
            break;
        case ".xlsx":
            return <FileExcelOutlined style={{ fontSize: iconSize || '40px', color: ' green' }} />
            break;
        case ".txt":
            return <FileTextOutlined style={{ fontSize: iconSize || '40px', color: ' gray' }} />
            break;
        case ".zip":
            return <FileZipOutlined style={{ fontSize: iconSize || '70px', color: ' #F7E190' }} />
            break;
        case ".html":
            return <Html5Outlined style={{ fontSize: iconSize || '70px', color: ' orange' }} />
            break;
        default:
            return <FileOutlined style={{ fontSize: iconSize || '45px', Scolor: 'gray' }} />
            break;
    }
}