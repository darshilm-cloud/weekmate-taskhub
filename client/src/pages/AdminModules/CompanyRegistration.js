import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Upload, Space, message, Card, Col, Row, Popconfirm, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  UserOutlined
} from '@ant-design/icons';
import moment from 'moment';
import Service from '../../service';

const CompanyRegistration = () => {
  const [companies, setCompanies] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalData, setTotalData] = useState(0);
  const localData = JSON.parse(localStorage.getItem('userData'));
  const [modalData, setModalData] = useState({ mode: 'add', record: null });
  const [docFldLogo, setDocFldLogo] = useState(localStorage.getItem('companyLogoUrl'));
  const [docFldFavicon, setDocFldFavicon] = useState(localStorage.getItem('companyFavIcoUrl'));

  const [faviconFileList, setFaviconFileList] = useState([]);
  const [logoFileList, setLogoFileList] = useState([]);
  
  
  // const [docFldFaviconlocal, setDocFldFaviconlocal] = useState(localStorage.getItem('companyFavIcoUrl')||null);
  // const [docFldLogolocal, setDocFldLogolocal] = useState(localStorage.getItem('companyLogoUrl')||null);

  const [form] = Form.useForm();
  const navigate = ()=>{};

  // Pagination, sorting, filtering state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchText, setSearchText] = useState('');

  const handleApiError = (error) => {
    console.error('API Error:', error);
    message.error(error?.message || 'Something went wrong. Please try again.');
  };

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const payload = {
        page,
        limit: pageSize,
        search: searchText,
        sort: sortOrder,
        sortBy,
      };

      // const response = await ApiService.post(API_ENDPOINTS.getCompanyList, payload);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getDashboardData
      });


      if (response?.data) {
        
        setCompanies(response?.data || []);
        setTotalData(response?.metadata?.total || 0);
        setDocFldFavicon(response?.data[0]?.companyFavIcoUrl)
        setDocFldLogo(response?.data[0]?.companyLogoUrl)
        console.log(response?.data[0]?.companyFavIcoUrl,'response?.data[0]?.companyFavIcoUrl');
        
      } else {
        message.error('Failed to fetch company list');
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchText]);

  // useEffect(() => {
  //   fetchCompanies();
  // }, [fetchCompanies]);

  const showAddEditModal = (mode = 'add', record = null) => {
    setModalData({ mode, record });
    setIsModalVisible(true);

    if (record) {
      form.setFieldsValue({
        companyName: record.companyName,
        companyEmail: record.companyEmail || record.email,
        domain: record.domain,
        slug: record.slug,
        ownerName: record.ownerName,
        logo: `${process.env.REACT_APP_API_URL}${record.companyLogoUrl}`,
        favicon: `${process.env.REACT_APP_API_URL}${record.companyLogoUrl}`

      });
      setDocFldLogo(record.companyLogoUrl);
      setDocFldFavicon(record.companyLogoUrl);
      setEditingCompany(record);
    } else {
      form.resetFields();
      setDocFldLogo(null);
      setDocFldFavicon(null);
      setEditingCompany(null);
    }
  };

  const handleDelete = useCallback(async (id) => {
    setLoading(true);
    try {
      // const response = await ApiService.delete(`${API_ENDPOINTS.deleteCompany}/${id}`);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getDashboardData
      });

      if (response?.statusCode === 200) {
        message.success('Company deleted successfully');
        fetchCompanies();
      } else {
        message.error('Failed to delete company');
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [fetchCompanies]);


  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        companyName: values.companyName,
        companyEmail: values.companyEmail,
        domain: values.domain,
        slug: values.slug,
        logo: docFldLogo,
        favicon: docFldFavicon,
        ownerName: values.ownerName,
        
      };
      

      let response;
      if (editingCompany) {
        // response = await ApiService.put(
        //   `${API_ENDPOINTS.editCompany}/${editingCompany._id}`,
        //   payload
        // );
         response = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: Service.getDashboardData
        });
  
      } else {
        // response = await ApiService.post(API_ENDPOINTS.addCompany, payload);
        response = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: Service.getDashboardData
        });
  
      }

      if (response?.statusCode === 200) {
        
        message.success(`Company ${editingCompany ? 'updated' : 'added'} successfully`);
        let updatedCompany=response.data.updatedCompany

        const resetToken = response?.data?.resetToken;
        const savedCompany = response?.data?.saveCompany;
        const lastActiveChat=response?.data?.lastActiveChat
        const companyId=response?.data?.companyId
const fileUploadSize=response?.data?.fileUploadSize
        const updatedLocalData = {
          ...localData,
          companyName:updatedCompany?.companyName,
          companyEmail:updatedCompany?.companyEmail,
          companyLogoUrl:updatedCompany?.companyLogoUrl,
          domain:updatedCompany?.domain,
          companyFavIcoUrl:updatedCompany?.companyFavIcoUrl,

          lastActiveChat:lastActiveChat  ,channelId:lastActiveChat?.id  ,companyId  ,fileUploadSize  //
        };
    
        
        localStorage.setItem('userData', JSON.stringify(updatedLocalData));        
          localStorage.setItem('companyFavIcoUrl', updatedCompany?.companyFavIcoUrl);
          localStorage.setItem('companyLogoUrl', updatedCompany?.companyLogoUrl);
        await fetchCompanies();

        // companyId:saveCompany?._id,

        console.log(savedCompany, 'savedCompany');
        
        if (!editingCompany && resetToken && savedCompany) {
          // ✅ Create updated localData first
          const updatedLocalData = {
            ...localData,
            companyName: savedCompany.companyName,
            companyEmail: savedCompany.companyEmail,
            companyLogoUrl: savedCompany.companyLogoUrl,
            domain: savedCompany.domain,
            companyFavIcoUrl: savedCompany.companyFavIcoUrl,
            lastActiveChat:lastActiveChat  ,channelId:lastActiveChat?.id  ,companyId     ,fileUploadSize };
        
          // ✅ Then update both in localStorage
          localStorage.setItem('authToken', resetToken);
          localStorage.setItem('userData', JSON.stringify(updatedLocalData));
          // window.location.reload();
          // ✅ Optional: Update app state immediately if needed
          // setUserData(updatedLocalData); // If you're using a useState or context
          // setAuthToken(resetToken);      // Optional state update
        }
        window.location.reload();
        
        setIsModalVisible(false);
        setDocFldLogo(localStorage.getItem('companyLogoUrl')||null)
        setDocFldFavicon(localStorage.getItem('companyFavIcoUrl')||null)
        // localStorage.setItem("authToken", response?.token);
        // setTimeout(() => { fetchCompanies(); }, 2000);
      } else {
        message.error('Failed to save company');
      }
    } catch (error) {
      console.log(error,'errorADDCOMp');
      if(error?.response?.data.statusCode==400){
        message.error(error?.response?.data.message)
      }
      // handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [editingCompany, fetchCompanies, docFldLogo, docFldFavicon, form]);

  const handleLogoUpload = useCallback(async ({ file, onSuccess, onError }) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      // const response = await ApiService.post('/upload/uploadFile?file_for=company_logo', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // });

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getDashboardData
      });


      if (response?.statusCode === 200) {
        const { originalUrl } = response.data;
        message.success(response.message);
        setDocFldLogo(response?.data[0]?.originalUrl);
        form.setFieldsValue({ logo: originalUrl });
        onSuccess(response.data, file);
      } else {
        message.error('Logo upload failed');
        onError(new Error('Upload failed'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      message.error(error?.response?.data?.message || 'Error uploading logo');
      onError(error);
    }
  }, [form]);

  const handleFaviconUpload = useCallback(async ({ file, onSuccess, onError }) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      // const response = await ApiService.post('/upload/uploadFile?file_for=favicon', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // });

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.getDashboardData
      });


      if (response?.statusCode === 200) {
        const { originalUrl } = response.data;
        message.success(response.message);
        
        setDocFldFavicon(response?.data[0]?.originalUrl);
        form.setFieldsValue({ favicon: originalUrl });
        onSuccess(response.data, file);
      } else {
        message.error('Favicon upload failed');
        onError(new Error('Upload failed'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      message.error(error?.response?.data?.message || 'Error uploading favicon');
      onError(error);
    }
  }, [form]);

  const columns = [
    {
      title: 'Company Name',
      dataIndex: 'companyName',
      sorter: true,
    },
    {
      title: 'Email',
      dataIndex: 'companyEmail',
      sorter: true,
      render: (text, record) => text || record.email,
    },
    {
      title: 'Company Slug',
      dataIndex: 'domain',
      sorter: true,
    },
    {
      title: 'Total Employees',
      render: (_, record) => record.maxUsers || 0,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      render: (text) => moment(text).format('MMM DD, YYYY'),
      sorter: true,
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
         <Tooltip title="View Employees">  <Button className='view-btn' icon={ <UserOutlined /> } onClick={ () => navigate("/admin/company-employee")} /></Tooltip>
         <Tooltip title="Edit">   <Button className='edit-btn' icon={ <EditOutlined /> } onClick={ () => showAddEditModal('edit', record) } /></Tooltip>
          <Popconfirm
        title={`Are you sure you want to delete ${record?.companyName}?`}
        onConfirm={() => handleDelete(record._id)}
        okText="Yes"
        cancelText="No"
      >         <Tooltip title="Delete">
          <Button
            className='delete-btn'
            icon={ <DeleteOutlined /> }
            danger
            loading={ loading }
          />
          </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    if (isModalVisible) {
      const userData = JSON.parse(localStorage.getItem('userData')) || {};
  
      setDocFldLogo(userData.companyLogoUrl || null);
      setDocFldFavicon(userData.companyFavIcoUrl || null);
    }
  }, [isModalVisible]);
  
  return (
    <>
      <Card >
        <div className='heading-wrapper'>
          <h2>Company Registration</h2>
          {localData?.roleName === 'Admin' && totalData === 0 && (
            <div style={ { display: 'flex', justifyContent: 'flex-end', marginBottom: 10 } }>
              <Button
                type="primary"
                icon={ <PlusOutlined /> }
                onClick={ () => showAddEditModal('add') }
                loading={ loading }
              >
                Add Company
              </Button>
            </div>
          ) }
        </div>
        <div className='global-search'>

          <Input.Search
            placeholder="Search companies"
            allowClear

            size="middle"
            onSearch={ (value) => {
              setSearchText(value);
              setPage(1); // Reset to first page when search changes
            } }
            style={ { width: 300 } }
          />
        </div>
        <Table
          rowKey="_id"
          columns={ columns }
          dataSource={ companies }
          loading={ loading }
          pagination={ {
            current: page,
            pageSize,
            total: totalData,
            showSizeChanger: true,
            pageSizeOptions: [ '20', '30', '50'],
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            }
          } }
          onChange={ (pagination, filters, sorter) => {
            if (sorter.order) {
              setSortBy(sorter.field);
              setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
            } else {
              // If user clears sorting
              setSortBy('createdAt');
              setSortOrder('desc');
            }
          } }
        />

        <Modal
          title={
            modalData.mode === 'view'
              ? 'View Company'
              : modalData.mode === 'edit'
                ? 'Edit Company'
                : 'Add New Company'
          }
          open={ isModalVisible }
          onCancel={() => {
            setIsModalVisible(false);
          
            const userData = JSON.parse(localStorage.getItem('userData')) || {};
            setFaviconFileList([]);
            setLogoFileList([])

            setDocFldLogo(userData.companyLogoUrl || null);
            setDocFldFavicon(userData.companyFavIcoUrl || null);
          }}
          footer={
            modalData.mode === 'view' ? (
              <Button type='primary' className="delete-btn" onClick={ () => setIsModalVisible(false) } disabled={ loading }>
                Close
              </Button>
            ) : (
              <>
                <Button type='primary' className="delete-btn" onClick={ () => setIsModalVisible(false) } disabled={ loading }>
                  Cancel
                </Button>
                <Button
                  className="btn-save"
                  type="primary"
                  loading={ loading }
                  onClick={ handleSave }
                >
                  Save
                </Button>
              </>
            )
          }
        >
          <Form form={ form } layout="vertical">

            <Form.Item
              name="companyName"
              label="Company Name"
              rules={ [{ required: true, message: 'Please enter company name' }] }
            >
              <Input
                placeholder="Enter company name"
                disabled={ modalData.mode === 'view' }
              />
            </Form.Item>

            <Form.Item
              name="companyEmail"
              label="Company Email"
              rules={ [
                { required: true, message: 'Please enter company email' },
                { type: 'email', message: 'Invalid email format' },
              ] }
            >
              <Input
                placeholder="Enter company email"
                disabled={ modalData.mode === 'view' }
              />
            </Form.Item>

            <Form.Item
              name="domain"
              label="Comapany Slug"
              rules={[
                { required: true, message: 'Please enter company slug' },
                {
                  pattern: /^[a-zA-Z0-9]+$/,
                  message: 'Use only letters and numbers. Spaces and special characters are not allowed.',
                },
                {
                  max: 25,
                  message: 'Slug must be at most 25 characters long.',
                },
                {
                  validator: (_, value) => {
                    if (value && /^[0-9]+$/.test(value)) {
                      return Promise.reject(new Error('Slug cannot be numbers only. Include at least one letter.'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input
                placeholder="Enter company slug"
                disabled={ modalData.mode === 'view' }
              />
            </Form.Item>


            <Row gutter={ 24 }>
              <Col xs={ 24} sm={ 12 } >

                <Form.Item label="Logo">
                  <Upload
                    name="logo"
                    listType="picture"
                    maxCount={ 1 }
                    customRequest={ handleLogoUpload }
                    disabled={ modalData.mode === 'view' }
                    fileList={logoFileList}
                    onChange={({ fileList }) => {
                      setLogoFileList(fileList);
                    }}
                    showUploadList={ { showPreviewIcon: true } }
                    beforeUpload={(file) => {
                      const isAllowedType =
                        file.type === 'image/png' ||
                        file.type === 'image/svg+xml' ||
                        file.type === 'image/jpeg'; // for .jpg and .jpeg
                    
                      if (!isAllowedType) {
                        message.error('Only PNG, JPG and SVG files are allowed!');
                      }
                    
                      return isAllowedType || Upload.LIST_IGNORE;
                    }}
                    
                  >
                    <Button icon={ <UploadOutlined /> } disabled={ modalData.mode === 'view' }>
                      Upload Logo
                    </Button>
                  </Upload>
                 
                  { docFldLogo && (
                    <img
                      src={ `${docFldLogo}` }
                      alt="Logo"
                      style={ { marginTop: 8, width: 100, height: 'auto' } }
                    />
                  ) }
                </Form.Item>
              </Col>
              <Col xs={ 24} sm={ 12 } >
                <Form.Item label="Favicon">
                  <Upload
                    name="favicon"
                    listType="picture"
                    maxCount={ 1 }
                    customRequest={ handleFaviconUpload }
                    disabled={ modalData.mode === 'view' }
                    fileList={faviconFileList}
                    onChange={({ fileList }) => {
                      setFaviconFileList(fileList);
                    }}
                    showUploadList={ { showPreviewIcon: true } }
                    beforeUpload={(file) => {
                      const isAllowedType =
                        file.type === 'image/png' ||
                        file.type === 'image/svg+xml' ||
                        file.type === 'image/jpeg'; // for .jpg and .jpeg
                    
                      if (!isAllowedType) {
                        message.error('Only PNG, JPG and SVG files are allowed!');
                      }
                    
                      return isAllowedType || Upload.LIST_IGNORE;
                    }}
                    
                  >
                    <Button icon={ <UploadOutlined /> } disabled={ modalData.mode === 'view' }>
                      Upload Favicon
                    </Button>
                  </Upload>
                  {console.log(docFldFavicon,'docFldFavicon')
                  }
                  { docFldFavicon  && (
                    <img
                      src={ `${docFldFavicon}` }
                      alt="Favicon"
                      style={ { marginTop: 8, width: 32, height: 32 } }
                    />
                  ) }
                </Form.Item>
                
              </Col>
            </Row>
          </Form>
        </Modal>
      </Card>
    </>
  );
};

export default CompanyRegistration;
