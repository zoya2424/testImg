const authClient = require('./clientCreator.js'),
expect = require('expect.js'),
settings = require('./settings');

const maxLimit = 200;
const defaultLimit = 100;

let assertErrorGet = (response, message, target) => {
    expect(response.status).to.equal(400);
    expect(response.data.statusCode).to.equal('badRequest');
    expect(response.data).to.have.keys('requestId', 'traceId', 'error');
    expect(response.data.error).to.have.keys('code', 'message', 'target', 'errors');
    expect(response.data.error.errors[0].code).to.equal('not-valid');
    expect(response.data.error.errors[0].message).to.equal(message);
    expect(response.data.error.errors[0].target).to.equal(target);
};

let assertSuccessGet = (response, limit, chatSide) => {
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('chats');
    expect(response.data.chats.length).to.be.lessThan(limit+1);
    for (let i = 0; i < response.data.chats.length; i++) {
        expect(response.data.chats[i]).to.have.property('id');
        expect(response.data.chats[i]).to.have.property('chatType');
        expect(response.data.chats[i]).to.have.property('chatSide');
        expect(response.data.chats[i].chatSide).to.equal(chatSide);
        expect(response.data.chats[i]).to.have.property('unreadMessagesCount');
        expect(response.data.chats[i]).to.have.property('lastUpdatedAt');
        expect(response.data.chats[i]).to.have.property('requestInfo');
        expect(response.data.chats[i].requestInfo.productType).to.equal('guarantee');
        expect(response.data.chats[i].requestInfo).to.have.property('customerId');
        expect(response.data.chats[i].requestInfo).to.have.property('vendorId');
        expect(response.data.chats[i].requestInfo).to.have.property('id');
        expect(response.data.chats[i].requestInfo).to.have.property('productData');
    }
};

describe('Get list of chats', () => {
    let client;

    beforeEach(async() => {
        client = await authClient.getClient('chats', settings.apikey, settings.login, settings.password);
    });
 
    const chatSides = ['customer', 'admin', 'vendor'];
    const cabinetId = ['spectr'];

    chatSides.forEach(chatSide => {
        it(`Get list of chats with only required params (chatSide=` + chatSide +`, cabinetId=` + cabinetId +` ): expect status 200`, async() => {
            const response = await client.get('?chatSide=' + chatSide + '&cabinetId=' + cabinetId);
            assertSuccessGet(response, defaultLimit, chatSide);
        });
    });

    it('Get list of chats with max limit = 200: expect status 200', async() => {
        const chatSide = 'admin';
        const response = await client.get('?limit=' + maxLimit +'&chatSide=' + chatSide + '&cabinetId=' + cabinetId);
        assertSuccessGet(response, maxLimit, chatSide);
    });

    it('Get list of chats with limit = 1: expect status 200', async() => {
        const chatSide = 'customer';
        const response = await client.get('?limit=1&chatSide=' + chatSide + '&cabinetId=' + cabinetId);
        assertSuccessGet(response, 1, chatSide);
    });

    it('Get list of chats with limit = 0: expect status 200', async() => {
        const chatSide = 'admin';
        const response = await client.get('?limit=0&chatSide=' + chatSide + '&cabinetId=' + cabinetId);
        assertSuccessGet(response, 0, chatSide);
        expect(response.data.chats).to.be.empty();
    });

    it('Get list of chats with fromId: expect status 200', async() => {
        const chatSide = 'customer';
        const response = await client.get('?fromId=123&chatSide=' + chatSide + '&cabinetId=' + cabinetId);
        assertSuccessGet(response, defaultLimit, chatSide);
    });

    it('Options (chats): expect status 200', async() => {
        const response = await client.options('');
        expect(response.status).to.equal(200);
        expect(response.headers).to.have.property('allow');
        expect(response.headers.allow).to.equal('GET,OPTIONS');
    });
});

describe('Get list of chats: negative', () => {
    let client;
    const cabinetId = ['spectr'];

    beforeEach(async() => {
        client = await authClient.getClient('chats', settings.apikey, settings.login, settings.password);
    });

    it('Get list of chats without chatSide: expect status 400', async() => {
        const response = await client.get('?cabinetId=' + cabinetId);
        assertErrorGet(response, 'The ChatSide property is required.', 'ChatSide');    
    });

    it('Get list of chats without cabinetId: expect status 400', async() => {
        const response = await client.get('?chatSide=customer');
        assertErrorGet(response, 'The CabinetId property is required.', 'CabinetId');
    });

    it('Get list of chats with empty chatSide: expect status 400', async() => {
        const response = await client.get('?ChatSide&cabinetId=' + cabinetId);
        assertErrorGet(response, 'A value is required.', 'ChatSide');
    });

    it('Get list of chats with empty cabinetId: expect status 400', async() => {
        const response = await client.get('?ChatSide=admin&cabinetId');
        assertErrorGet(response, 'The query parameter CabinetId can not be null or white space', '');        
        }); 

    it('Get list of chats with incorrect chatSide: expect status 400', async() => {
        incorrectChatSide = 'nfkdnj';
        const response = await client.get('?ChatSide=' + incorrectChatSide + '&cabinetId=' + cabinetId);
        assertErrorGet(response, "The value '" + incorrectChatSide + "' is not valid for ChatSide.", 'ChatSide');
        expect(response.data.error.errors[1].message).to.equal('The ChatSide property is required.');
    });  

    it('Get list of chats with incorrect cabinetId: expect status 200 и пустой массив', async() => {
        incorrectCabinetId = 'nfkdnj';
        const response = await client.get('?ChatSide=admin&cabinetId=' + incorrectCabinetId);
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('chats');
        expect(response.data.chats.length).to.equal(0);
        expect(response.data.chats).to.be.empty();
    });

    it('Get list of chats with incorrect type of limit (limit is not number): expect status 400', async() => {
        const response = await client.get('?chatSide=customer&limit=cat' + '&cabinetId=' + cabinetId);
        assertErrorGet(response, 'The value \'cat\' is not valid for Limit.','Limit');
    });

    it('Get list of chats with limit greater than max value: expect status 400', async() => {
        const response = await client.get('?chatSide=customer&limit=' + (maxLimit+1) + '&cabinetId=' + cabinetId);
        assertErrorGet(response, 'The field Limit must be between 0 and 200.','Limit');
    });
   
    it('Get list of chats without authorization : expect status 401', async() => {
        let noAuthclient = await authClient.getNoAuthClient('chats');
        noAuthclient.defaults.headers['X-Singular-Service'] = 'Kontur.BG.Chats.API';
        noAuthclient.defaults.headers['X-Singular-Zone'] = 'bg-' + process.env.npm_config_zone;

        const response = await noAuthclient.get('?chatSide=admin' + '&cabinetId=' + cabinetId);
        expect(response.status).to.equal(401);
        expect(response.data.statusCode).to.equal('unauthorized');
        expect(response.data).to.have.property('requestId');
        expect(response.data.error.code).to.equal('system');
        expect(response.data.error.message).to.equal('Authorization has been denied for this request.');
    });

    it('Get list of chats without apikey: expect status 401', async() => {
        delete client.defaults.headers['X-KONTUR-APIKEY'];

        const response = await client.get('?chatSide=vendor' + '&cabinetId=' + cabinetId);
        expect(response.status).to.equal(401);
        expect(response.data.statusCode).to.equal('unauthorized');
        expect(response.data).to.have.property('requestId');
        expect(response.data.error.code).to.equal('auth:invalid-credentials');
        expect(response.data.error.message).to.equal('The API key is invalid or not present.');
    });
});