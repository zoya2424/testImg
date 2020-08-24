const authClient = require('./clientCreator.js'),
expect = require('expect.js'),
settings = require('./settings');
    
const chatTypes = ['customerToAdmin', 'customerToVendor'];
const chatSides = ['customer', 'admin', 'vendor'];

let assertSuccessGet = (response, chatSide) => {
    expect(response.status).to.equal(200);
    expect(response.data).to.have.keys('id', 'chatType', 'chatSide', 'channelId', 'unreadMessagesCount', 'lastUpdatedAt', 'requestInfo');
    expect(response.data.chatSide).to.equal(chatSide);
    expect(response.data.requestInfo).to.have.keys('id', 'productType', 'customerId', 'vendorId', 'productData');
    expect(response.data.requestInfo.productData).to.have.keys('purchaseId', 'guaranteeType', 'amountWasIncreased');
};

let assertError = (response, target) => {
    expect(response.status).to.equal(400);
    expect(response.data.statusCode).to.equal('badRequest');
    expect(response.data).to.have.keys('requestId', 'traceId', 'error');
    expect(response.data.error).to.have.keys('code', 'message', 'target', 'errors');
    expect(response.data.error.code).to.equal('not-valid');
    expect(response.data.error.message).to.equal('The request is invalid.');
    expect(response.data.error.errors[0]).to.have.keys('code', 'message', 'target');
    expect(response.data.error.errors[0].target).to.equal(target);   
};

describe('Resolve chats', () => {
    let client, cabinetClient, requestId, organizationId, vendorId;

    before(async () => {
        cabinetClient = await authClient.getClient('cabinet', settings.apikey, settings.userLogin, settings.password);
        client = await authClient.getClient('admin', settings.apikey, settings.login, settings.password);
        
        const organization = await cabinetClient.post('organizations', {'inn': '3128125873'});       
        organizationId = organization.data.id;
        const vendor = await client.post('v1/banks', {'inn': '7722658440'});
        vendorId = vendor.data.id;
    });

    beforeEach(async() => {
        const request = await cabinetClient.post('requests/guarantees', {"data": {"purchaseId": "12313"},"organizationId": organizationId});
        requestId = request.data.id;
    });

    chatTypes.forEach(chatType => {
        it(`Resolve chats with chatType = ` + chatType + ` and with chatSide customer: expect status 200`, async() => {
            const userClient = await authClient.getClient('chats', settings.apikey, settings.userLogin, settings.password);
            chatSide = 'customer';
            const response = await userClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': vendorId});
            assertSuccessGet(response, chatSide);
        });
    });

    it('Resolve chats with chatType = customerToAdmin and with chatSide = admin: expect status 200', async() => {
        const adminClient = await authClient.getClient('chats', settings.apikey, settings.login, settings.password);
        chatType = 'customerToAdmin'; 
        chatSide = 'admin';
        const response = await adminClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': vendorId});
        assertSuccessGet(response, chatSide);
    });

    it('Resolve chats with chatType = customerToVendor and with chatSide = vendor: expect status 200', async() => {
        const  thisVendorId = 'b9df9f7a-1a5d-4f35-ac97-8eb312b3e4f6'; //сгб банк для пользователя 'ankDilon@gmail.com',
        const workplaceClient = await authClient.getClient('chats', settings.apikey, settings.bankLogin, settings.password);
        chatType = 'customerToVendor'; 
        chatSide = 'vendor';
        const response = await workplaceClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': thisVendorId});
        assertSuccessGet(response, chatSide);
    });

    it('Options (chats): expect status 200', async() => {
        client = await authClient.getClient('chats', settings.apikey, settings.login, settings.password);
        const response = await client.options('resolve');
        expect(response.status).to.equal(200);
        expect(response.headers).to.have.property('allow');
        expect(response.headers.allow).to.equal('POST,OPTIONS');
    });

    after(async () => {
        const userGroup = await cabinetClient.get('user-groups');
        for (let i = 0; i < userGroup.data.length; i++) {
            await cabinetClient.post('user-groups/' + userGroup.data[i].id +'/exclude', {"userId": "b179a34a-2993-47b1-97e6-63aaede6060e"});
        };
        await cabinetClient.delete('organizations/' + organizationId);
        await client.delete('v1/banks/' + vendorId);
    });
});

describe('Resolve chat: negative', () => {
    let client, adminCabinet, cabinetClient, userClient, adminClient, workplaceClient, requestId, organizationId, vendorId;

    before(async() => {
        cabinetClient = await authClient.getClient('cabinet', settings.apikey, settings.userLogin, settings.password);
        adminCabinet = await authClient.getClient('admin', settings.apikey, settings.login, settings.password);

        const organization = await cabinetClient.post('organizations', {'inn': '3128125873'});       
        organizationId = organization.data.id;
        const vendor = await adminCabinet.post('v1/banks', {'inn': '3328427110'});
        vendorId = vendor.data.id;
    });

    beforeEach(async() => {
        client = await authClient.getClient('chats', settings.apikey, settings.login, settings.password);
        userClient = await authClient.getClient('chats', settings.apikey, settings.userLogin, settings.password);
        adminClient = await authClient.getClient('chats', settings.apikey, settings.login, settings.password);
        workplaceClient = await authClient.getClient('chats', settings.apikey, settings.bankLogin, settings.password);

        const request = await cabinetClient.post('requests/guarantees', {"data": {"purchaseId": "12313"},"organizationId": organizationId});
        requestId = request.data.id;
    });

    chatTypes.forEach(chatType => {
        it(`Resolve chats with cabinetSid ` + chatType + ` and with chatSide = admin: expect status 400`, async() => {
            const chatSide = 'Admin';

            const response = await userClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': vendorId});
            assertError(response, 'ChatResolveInfo');
            expect(response.data.error.errors[0].message).to.equal('User has not access to chat from side "' + chatSide + '".');
        });
    });

    chatTypes.forEach(chatType => {
        it(`Resolve chats with cabinetSid ` + chatType + ` and with chatSide = vendor: expect status 400`, async() => {
            const  thisVendorId = 'b9df9f7a-1a5d-4f35-ac97-8eb312b3e4f6'; //сгб банк для пользователя 'ankDilon@gmail.com',
            const chatSide = 'Vendor';

            const response = await userClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': thisVendorId});
            assertError(response, 'ChatResolveInfo');
            expect(response.data.error.errors[0].message).to.equal('User has not access to chat from side "' + chatSide + '".');
        });
    });

    chatTypes.forEach(chatType => {
        it(`Resolve chats with adminSid ` + chatType + ` and with chatSide = customer: expect status 400`, async() => {
            const chatSide = 'Customer';

            const response = await adminClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': vendorId});
            assertError(response, 'ChatResolveInfo');
            expect(response.data.error.errors[0].message).to.equal('User has not access to chat from side "' + chatSide + '".');
        });
    });

    chatTypes.forEach(chatType => {
        it(`Resolve chats with adminSid ` + chatType + ` and with chatSide = vendor: expect status 400`, async() => {
            const  thisVendorId = 'b9df9f7a-1a5d-4f35-ac97-8eb312b3e4f6'; //сгб банк для пользователя 'ankDilon@gmail.com',
            const chatSide = 'Vendor';

            const response = await adminClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': thisVendorId});
            assertError(response, 'ChatResolveInfo');
            expect(response.data.error.errors[0].message).to.equal('User has not access to chat from side "' + chatSide + '".');
        });
    });

    chatTypes.forEach(chatType => {
        it(`Resolve chats with vendorSid ` + chatType + ` and with chatSide = customer: expect status 400`, async() => {
            const  thisVendorId = 'b9df9f7a-1a5d-4f35-ac97-8eb312b3e4f6'; //сгб банк для пользователя 'ankDilon@gmail.com',
            const chatSide = 'Customer';

            const response = await workplaceClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': thisVendorId});
            assertError(response, 'ChatResolveInfo');
            expect(response.data.error.errors[0].message).to.equal('User has not access to chat from side "' + chatSide + '".');
        });
    });

    chatTypes.forEach(chatType => {
        it(`Resolve chats with vendorSid ` + chatType + ` and with chatSide = admin: expect status 400`, async() => {
            const  thisVendorId = 'b9df9f7a-1a5d-4f35-ac97-8eb312b3e4f6'; //сгб банк для пользователя 'ankDilon@gmail.com',
            const chatSide = 'Admin';

            const response = await workplaceClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': thisVendorId});
            assertError(response, 'ChatResolveInfo');
            expect(response.data.error.errors[0].message).to.equal('User has not access to chat from side "' + chatSide + '".');
        });
    });

    it('Resolve chats with chatType = customerToVendor and with chatSide = vendor, but with another vendorId: expect status 400', async() => {
        chatType = 'customerToVendor'; 
        chatSide = 'Vendor';

        const response = await workplaceClient.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId, 'vendorId': vendorId});
        assertError(response, 'ChatResolveInfo');
        expect(response.data.error.errors[0].message).to.equal('User has not access to chat from side "' + chatSide + '".');
    });

    chatTypes.forEach(chatType => {
        chatSides.forEach(chatSide => {
            it(`Resolve chats without vendorId (for chatSide = ` + chatSide + ` and chatType = ` + chatType + `): expect status 400`, async() => {
                const response = await client.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestId});
                assertError(response, 'viewResolveInfo');
            });
        });
    });

    chatTypes.forEach(chatType => {
        chatSides.forEach(chatSide => {
            it(`Resolve chats with non-existent vendorId (for chatType= ` + chatType + ` and with chatSide = ` + chatSide + `): expect status 200`, async() => {
                const response = await client.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'vendorId': 'non-existent', 'requestId': requestId});
                assertError(response, 'VendorId');
                expect(response.data.error.errors[0].message).to.equal('Vendor with id "non-existent" not found.');
            });
        });
    });

    chatTypes.forEach(chatType => {
        chatSides.forEach(chatSide => {
            it(`Resolve chats with requestId from guaranteeLine (for chatType = ` + chatType + ` and with chatSide = ` + chatSide + `): expect status 200`, async() => {
                const requestLine = await cabinetClient.post('requests/guarantee-lines', {"data": {},"organizationId":organizationId});
                
                const response = await client.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': requestLine.data.id, 'vendorId': vendorId});
                assertError(response, 'RequestId');
                expect(response.data.error.errors[0].message).to.equal('Request with id "' + requestLine.data.id + '" not found.');
            });
        });
    });

    chatTypes.forEach(chatType => {
        it(`Resolve chats without chatSide for chatType = ` + chatType + `: expect status 400`, async() => {
            const response = await client.post('resolve', {'chatType': chatType, 'requestId': requestId, 'vendorId': vendorId});
            assertError(response,'viewResolveInfo');
        });
    });

    chatSides.forEach(chatSide => {
        it(`Resolve chats without chatType for chatSide =  ` + chatSide + `: expect status 400`, async() => {
            const response = await client.post('resolve', {'chatSide': chatSide, 'requestId': requestId, 'vendorId': vendorId});
            assertError(response, 'viewResolveInfo');
        });
    });

    chatTypes.forEach(chatType => {
        it(`Resolve chats with non-existent chatSide for chatType = ` + chatType + `: expect status 400`, async() => {
            const response = await client.post('resolve', {'chatType': chatType, 'chatSide': 'no', 'requestId': requestId, 'vendorId': vendorId});
            assertError(response, 'viewResolveInfo.chatSide');
        });
    });

    chatSides.forEach(chatSide => {
        it(`Resolve chats with non-existent chatType for chatSide =  ` + chatSide + `: expect status 400`, async() => {
            const response = await client.post('resolve', {'chatSide': chatSide, 'chatType': 'no', 'requestId': requestId, 'vendorId': vendorId});
            assertError(response, 'viewResolveInfo.chatType');
        });
    });

    chatTypes.forEach(chatType => {
        chatSides.forEach(chatSide => {
            it(`Resolve chats without requestId (for chatSide = ` + chatSide + ` and chatType = ` + chatType + `): expect status 400`, async() => {
                const response = await client.post('resolve', {'chatSide': chatSide, 'chatType': chatType, 'vendorId': vendorId});
                assertError(response, 'viewResolveInfo');
            });
        });
    });

    chatTypes.forEach(chatType => {
        chatSides.forEach(chatSide => {
            it(`Resolve chats with non-existent requestId ` + chatType + ` and with chatSide = ` + chatSide + `: expect status 200`, async() => {
                const wrongRequestId = 123;
                const response = await client.post('resolve', {'chatType': chatType, 'chatSide': chatSide, 'requestId': wrongRequestId, 'vendorId': vendorId});
                assertError(response, 'RequestId');
                expect(response.data.error.errors[0].message).to.equal('Request with id "' + wrongRequestId + '" not found.'); 
            });
        });
    });

    after(async () => {
        const userGroup = await cabinetClient.get('user-groups');
        for (let i = 0; i < userGroup.data.length; i++) {
            await cabinetClient.post('user-groups/' + userGroup.data[i].id +'/exclude', {"userId": "b179a34a-2993-47b1-97e6-63aaede6060e"});
        };
        await cabinetClient.delete('organizations/' + organizationId);
        await adminCabinet.delete('v1/banks/' + vendorId);
    });
});