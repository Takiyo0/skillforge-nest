import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BadgesService } from './badges/badges.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: BadgesService,
          useValue: {
            initializeDefaultBadges: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API welcome payload', () => {
      expect(appController.getHello()).toEqual({
        ok: true,
        message: 'Welcome to the SkillForge API!',
      });
    });
  });
});
